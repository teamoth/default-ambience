// Runs the macro-oscillator voices (WebAssembly) inside the audio thread.
// There are 16 voices: each orbit has two (the second lets notes overlap with "Let ring"),
// and every note message says which orbit's output it goes to.
// "trig" messages start a note; "set" messages only update the sound (used for modulation between notes).
//
// Voice budget: each voice type costs a different amount of processing (measured; the modal resonator is
// about ten times a typical type). When a new note would take the total over the budget, the voice that
// matters least is cut short with a quick fade, as hardware synths do ("voice stealing"): first notes that
// have already been released, then the oldest. The budget adapts to the device: it shrinks if the audio
// thread is getting busy and grows back slowly when there is room.
const NV = 16;
const IDLE_AFTER = 12;      // seconds; a voice that hasn't been triggered for this long is silent and skipped
const QUIET = 1e-4;         // below this level (about -80 dB) a released voice counts as finished
// processing cost per voice type, in % of one fast desktop core
const COST = { 0: 0.3, 1: 0.5, 3: 0.55, 5: 0.35, 6: 0.55, 8: 0.6, 9: 0.3, 10: 0.8, 11: 0.45, 12: 0.7, 13: 0.4,
  14: 0.55, 15: 0.2, 16: 0.8, 17: 0.35, 18: 3.7, 19: 2.0, 20: 6.5, 21: 0.4, 22: 0.4, 23: 0.4 };
const FADE = 0.012;         // seconds for a stolen voice to fade out
class MacroOsc extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.queue = [];
    this.lastTrig = new Float64Array(NV).fill(-1e9);
    this.ring = new Int8Array(NV);            // which orbit's output each voice plays into
    this.cost = new Float32Array(NV);
    this.gateEnd = new Float64Array(NV);      // when the note's gate ends (after this it is "released")
    this.until = new Float64Array(NV);        // for ADSR notes: when the release has certainly finished
    this.level = new Float32Array(NV);        // recent peak level, for natural (self-fading) notes
    this.gain = new Float32Array(NV).fill(1); // fades a stolen voice out
    this.vel = new Float32Array(NV).fill(1);  // loudness from the note's velocity (smoothed)
    this.velTo = new Float32Array(NV).fill(1);
    this.stolen = new Uint8Array(NV);
    this.on = new Uint8Array(NV);             // currently sounding
    this.budget = 30; this.busy = 0; this.busyMs = 0; this.since = 0; this.steals = 0;
    WebAssembly.instantiate(options.processorOptions.wasm, {}).then((r) => {
      this.e = r.instance.exports;
      this.e._initialize();
      this.e.mo_init();
      this.ready = true;
      this.port.postMessage({ type: "ready" });
    }).catch((err) => this.port.postMessage({ type: "error", message: String(err) }));
    this.port.onmessage = (ev) => {
      const d = ev.data;
      if (d.type === "trig" || d.type === "set") {
        const q = this.queue; let i = q.length;
        while (i > 0 && q[i - 1].time > d.time) i--;   // keep the queue in time order
        q.splice(i, 0, d);
      } else if (d.type === "clear") {
        this.queue.length = 0;
      }
    };
  }
  sounding(v, now) {
    if (this.stolen[v]) return this.gain[v] > 0;
    if (now - this.lastTrig[v] > IDLE_AFTER) return false;
    if (this.until[v] > 0) return now < this.until[v];                 // ADSR: known end
    return now < this.gateEnd[v] + 0.3 || this.level[v] > QUIET;         // natural: until it has faded
  }
  // make room for a note on voice v costing c
  makeRoom(v, c, now) {
    let total = c;
    for (let u = 0; u < NV; u++) if (u !== v && this.on[u] && !this.stolen[u]) total += this.cost[u];
    while (total > this.budget) {
      let best = -1, bestScore = Infinity;
      for (let u = 0; u < NV; u++) {
        if (u === v || !this.on[u] || this.stolen[u]) continue;
        const released = now > this.gateEnd[u];
        // released notes go first, quietest first; then the oldest note
        const score = (released ? 0 : 1e6) + (released && this.until[u] === 0 ? this.level[u] * 1e3 : 0) + this.lastTrig[u];
        if (score < bestScore) { bestScore = score; best = u; }
      }
      if (best < 0) break;
      this.stolen[best] = 1; total -= this.cost[best]; this.steals++;
    }
  }
  // Views onto each voice's output in the engine's memory, made once and reused: creating them on every
  // block made thousands of small objects a second, and clearing those up can briefly stall the audio (pops).
  view(v, n) {
    const mem = this.e.memory.buffer;
    if (mem !== this.mem) { this.mem = mem; this.views = []; }
    return this.views[v] || (this.views[v] = new Float32Array(mem, this.e.mo_buffer(v), n));
  }
  process(inputs, outputs) {
    if (!this.ready) return true;
    const t0 = Date.now();
    const e = this.e, CH = 8, rings = outputs.length, now = currentTime;
    for (let v = 0; v < NV; v++) this.on[v] = this.sounding(v, now) ? 1 : 0;
    for (let r = 0; r < rings; r++) if (outputs[r][0]) outputs[r][0].fill(0);
    const fadeStep = CH / (FADE * sampleRate);
    for (let k = 0; k < 128; k += CH) {
      const t = now + k / sampleRate;
      while (this.queue.length && this.queue[0].time <= t) {
        const d = this.queue.shift();
        if (d.type === "set" && !this.on[d.v]) continue;   // nothing sounding: the next note brings fresh settings
        e.mo_set(d.v, d.engine, d.harmonics, d.timbre, d.morph, d.decay, d.colour, d.hold ? 1 : 0);
        if (d.type === "set") continue;
        const c = COST[d.engine] || 0.6;
        this.makeRoom(d.v, c, t);
        e.mo_trigger(d.v, d.note);
        this.ring[d.v] = d.ring ?? (d.v % 4);
        this.cost[d.v] = c; this.lastTrig[d.v] = d.time;
        this.gateEnd[d.v] = d.time + (d.gate || 0.2);
        this.until[d.v] = d.until ? d.time + d.until : 0;
        this.level[d.v] = 1; this.gain[d.v] = 1; this.stolen[d.v] = 0; this.on[d.v] = 1;
        this.velTo[d.v] = d.vel ?? 1;
      }
      for (let v = 0; v < NV; v++) {
        if (!this.on[v]) continue;
        const out = outputs[this.ring[v]] && outputs[this.ring[v]][0];
        if (!out) continue;
        e.mo_render(v, CH);
        const buf = this.view(v, CH);
        let pk = 0;
        this.vel[v] += (this.velTo[v] - this.vel[v]) * 0.25;   // glide over ~1 ms so a new velocity never clicks
        const g = this.vel[v];
        if (this.stolen[v]) {
          for (let j = 0; j < CH; j++) { out[k + j] += buf[j] * g * this.gain[v]; }
          this.gain[v] = Math.max(0, this.gain[v] - fadeStep);
          if (this.gain[v] === 0) { this.on[v] = 0; this.lastTrig[v] = -1e9; }
        } else {
          for (let j = 0; j < CH; j++) { const x = buf[j]; out[k + j] += x * g; const a = x < 0 ? -x : x; if (a > pk) pk = a; }
          this.level[v] = Math.max(pk, this.level[v] * 0.995);
        }
      }
    }
    // how busy this thread is (Date.now is coarse, but averaged over many blocks it evens out)
    this.busyMs += Date.now() - t0;
    if (now - this.since >= 1) {
      const load = this.busyMs / ((now - this.since) * 1000);
      this.busy = load; this.busyMs = 0; this.since = now;
      // the cost table is cautious (heavy types cost less on high notes), so the budget follows how busy the thread really is
      if (load > 0.6) this.budget = Math.max(7, this.budget * 0.75);
      else if (load > 0.45) this.budget = Math.max(7, this.budget * 0.9);
      else if (load < 0.25) this.budget = Math.min(100, this.budget * 1.1);
      let n = 0, used = 0; for (let v = 0; v < NV; v++) if (this.on[v] && !this.stolen[v]) { n++; used += this.cost[v]; }
      this.port.postMessage({ type: "stats", voices: n, load, budget: this.budget, used, steals: this.steals });
    }
    return true;
  }
}
registerProcessor("macro-osc", MacroOsc);

// Stereo reverb return built from the open-source Beads reverb (fully wet).
class TextureReverb extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.params = { time: 0.75, lp: 0.7 };
    WebAssembly.instantiate(options.processorOptions.wasm, {}).then((r) => {
      this.e = r.instance.exports;
      this.e._initialize();
      this.e.rv_init();
      this.e.rv_set(this.params.time, this.params.lp);
      this.ready = true;
      this.port.postMessage({ type: "ready" });
    }).catch((err) => this.port.postMessage({ type: "error", message: String(err) }));
    this.port.onmessage = (ev) => {
      const d = ev.data;
      if (d.type === "set") {
        this.params = d;
        if (this.ready) this.e.rv_set(d.time, d.lp);
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!this.ready) return true;
    const e = this.e, inp = inputs[0] || [];
    const n = out[0].length;
    if (this.mem !== e.memory.buffer || this.n !== n) {   // made once and reused, not on every block
      this.mem = e.memory.buffer; this.n = n;
      this.L = new Float32Array(this.mem, e.rv_in_l(), n);
      this.R = new Float32Array(this.mem, e.rv_in_r(), n);
    }
    const L = this.L, R = this.R;
    if (inp[0]) L.set(inp[0]); else L.fill(0);
    if (inp[1]) R.set(inp[1]); else if (inp[0]) R.set(inp[0]); else R.fill(0);
    e.rv_process(n);
    out[0].set(L);
    if (out[1]) out[1].set(R);
    return true;
  }
}
registerProcessor("texture-reverb", TextureReverb);

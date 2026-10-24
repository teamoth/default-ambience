// Runs the macro-oscillator voices (WebAssembly) inside the audio thread.
// Ring i plays on engine voices i and i+4 (the second voice lets notes overlap).
// "trig" messages start a note; "set" messages only update the sound (used for modulation between notes).
// A voice that hasn't been triggered for a while is silent, so it is skipped entirely to save processing.
const IDLE_AFTER = 12; // seconds; longer than the longest natural decay
class MacroOsc extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ready = false;
    this.queue = [];
    this.lastTrig = new Float64Array(8).fill(-1e9);
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
        this.queue.push(d);
        this.queue.sort((a, b) => a.time - b.time);
      } else if (d.type === "clear") {
        this.queue.length = 0;
      }
    };
  }
  process(inputs, outputs) {
    if (!this.ready) return true;
    const e = this.e, CH = 8, rings = outputs.length;
    const active = [];
    for (let v = 0; v < 8; v++) active.push(currentTime - this.lastTrig[v] < IDLE_AFTER || this.queue.some((q) => q.v === v && q.type === "trig" && q.time < currentTime + 128 / sampleRate));
    for (let r = 0; r < rings; r++) if (outputs[r][0]) outputs[r][0].fill(0);
    for (let k = 0; k < 128; k += CH) {
      const t = currentTime + k / sampleRate;
      while (this.queue.length && this.queue[0].time <= t) {
        const d = this.queue.shift();
        e.mo_set(d.v, d.engine, d.harmonics, d.timbre, d.morph, d.decay, d.colour, d.hold ? 1 : 0);
        if (d.type === "set") continue; // a modulation update: change the sound without starting a note
        e.mo_trigger(d.v, d.note);
        this.lastTrig[d.v] = d.time;
        active[d.v] = true;
      }
      for (let v = 0; v < 8; v++) {
        if (!active[v]) continue;
        const out = outputs[v % 4] && outputs[v % 4][0];
        if (!out) continue;
        e.mo_render(v, CH);
        const buf = new Float32Array(e.memory.buffer, e.mo_buffer(v), CH);
        for (let j = 0; j < CH; j++) out[k + j] += buf[j];
      }
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
    const L = new Float32Array(e.memory.buffer, e.rv_in_l(), n);
    const R = new Float32Array(e.memory.buffer, e.rv_in_r(), n);
    if (inp[0]) L.set(inp[0]); else L.fill(0);
    if (inp[1]) R.set(inp[1]); else if (inp[0]) R.set(inp[0]); else R.fill(0);
    e.rv_process(n);
    out[0].set(L);
    if (out[1]) out[1].set(R);
    return true;
  }
}
registerProcessor("texture-reverb", TextureReverb);

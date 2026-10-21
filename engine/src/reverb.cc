// WebAssembly wrapper around the open-source Beads reverb (MIT licence,
// Copyright Emilie Gillet). Fully wet stereo return.
#include "beads/dsp/frame.h"
#include "beads/dsp/fx/reverb.h"
#include "beads/dsp/frame.h"

static uint16_t rv_mem[32768];
static beads::Reverb reverb;
static beads::FloatFrame frames[128];
static float in_l[128], in_r[128];

extern "C" {
__attribute__((export_name("rv_init")))
void rv_init() {
  reverb.Init(rv_mem, 48000.0f);
  reverb.set_mix(1.0f); reverb.set_time(0.7f); reverb.set_lp(0.7f);
}
__attribute__((export_name("rv_set")))
void rv_set(float time, float lp) { reverb.set_time(time); reverb.set_lp(lp); }
__attribute__((export_name("rv_in_l"))) float* rv_in_l() { return in_l; }
__attribute__((export_name("rv_in_r"))) float* rv_in_r() { return in_r; }
// Processes n frames in place: in_l/in_r become the wet output.
__attribute__((export_name("rv_process")))
void rv_process(int n) {
  for (int i = 0; i < n; ++i) { frames[i].l = in_l[i]; frames[i].r = in_r[i]; }
  reverb.Process(frames, n);
  for (int i = 0; i < n; ++i) { in_l[i] = frames[i].l; in_r[i] = frames[i].r; }
}
}

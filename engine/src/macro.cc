// Thin WebAssembly wrapper around the open-source Plaits voice (MIT licence,
// Copyright Emilie Gillet). Exposes N independent voices rendering at 48 kHz.
#include "plaits/dsp/voice.h"

using namespace plaits;

static const int kVoices = 16;
static const int kChunk = 8;

static char ram[kVoices][16384];
static Voice voices[kVoices];
static Patch patch[kVoices];
static Modulations mods[kVoices];
static int trig_blocks[kVoices];
static float out_buf[kVoices][128];

extern "C" {

__attribute__((export_name("mo_init")))
void mo_init() {
  for (int v = 0; v < kVoices; ++v) {
    stmlib::BufferAllocator allocator(ram[v], 16384);
    voices[v].Init(&allocator);
    Patch& p = patch[v];
    p.note = 60.0f; p.harmonics = 0.5f; p.timbre = 0.5f; p.morph = 0.5f;
    p.frequency_modulation_amount = 0.0f;
    p.timbre_modulation_amount = 0.0f;
    p.morph_modulation_amount = 0.0f;
    p.engine = 8; p.decay = 0.5f; p.lpg_colour = 0.5f;
    Modulations& m = mods[v];
    m.engine = 0; m.note = 0; m.frequency = 0; m.harmonics = 0;
    m.timbre = 0; m.morph = 0; m.trigger = 0; m.level = 0;
    m.frequency_patched = false; m.timbre_patched = false;
    m.morph_patched = false; m.trigger_patched = true; m.level_patched = false;
    trig_blocks[v] = 0;
  }
}

__attribute__((export_name("mo_set")))
// hold=1 holds the engine's gate fully open (no built-in "ping" envelope), so an
// external ADSR controls the volume. Struck engines (modal, string, six-op, drums)
// still have their own strike envelope.
void mo_set(int v, int engine, float harmonics, float timbre, float morph,
            float decay, float colour, int hold) {
  mods[v].level_patched = hold != 0;
  mods[v].level = hold ? 1.0f : 0.0f;
  Patch& p = patch[v];
  p.engine = engine; p.harmonics = harmonics; p.timbre = timbre;
  p.morph = morph; p.decay = decay; p.lpg_colour = colour;
}

__attribute__((export_name("mo_trigger")))
void mo_trigger(int v, float note) {
  patch[v].note = note;
  trig_blocks[v] = 3;  // hold the trigger high for a few blocks
}

__attribute__((export_name("mo_buffer")))
float* mo_buffer(int v) { return out_buf[v]; }

// Render `frames` samples (multiple of kChunk, <= 128) for voice v.
__attribute__((export_name("mo_render")))
void mo_render(int v, int frames) {
  Voice::Frame f[kChunk];
  for (int i = 0; i < frames; i += kChunk) {
    mods[v].trigger = trig_blocks[v] > 0 ? 1.0f : 0.0f;
    if (trig_blocks[v] > 0) --trig_blocks[v];
    voices[v].Render(patch[v], mods[v], f, kChunk);
    for (int j = 0; j < kChunk; ++j) out_buf[v][i + j] = f[j].out / 32768.0f;
  }
}

}

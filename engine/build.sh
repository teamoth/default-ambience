#!/bin/sh
# Rebuilds macro.wasm from source.
# Needs wasi-sdk (https://github.com/WebAssembly/wasi-sdk), version 24 or later, and git.
# Usage: WASI_SDK=/path/to/wasi-sdk sh engine/build.sh
set -e
cd "$(dirname "$0")"
[ -d eurorack ] || git clone --depth 1 https://github.com/pichenettes/eurorack.git eurorack
[ -f eurorack/stmlib/stmlib.h ] || { rm -rf eurorack/stmlib; git clone --depth 1 https://github.com/pichenettes/stmlib.git eurorack/stmlib; }
SRCS="src/macro.cc src/reverb.cc $(find eurorack/plaits/dsp -name '*.cc') eurorack/plaits/resources.cc eurorack/stmlib/dsp/units.cc eurorack/stmlib/utils/random.cc"
"$WASI_SDK/bin/clang++" --target=wasm32-wasi --sysroot="$WASI_SDK/share/wasi-sysroot" -O3 -DTEST -include cstdio \
  -fno-exceptions -fno-rtti -ffast-math -Ieurorack -Wno-everything -mexec-model=reactor \
  -Wl,--strip-all -Wl,--initial-memory=2097152 -o ../macro.wasm $SRCS
echo "Built ../macro.wasm"

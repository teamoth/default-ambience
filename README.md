# Default Ambience

A Euclidean sequencer for ambient music, made for phones and browsers.

**▶ Play it now: [teamoth.github.io/default-ambience](https://teamoth.github.io/default-ambience/)** (works in any modern browser, on phones and computers)

Four **orbits** each loop a rhythm: a number of hits spread as evenly as possible around a number of steps. Every hit picks a note from the scale you choose, so the melodies are random but always in key. Orbits of different lengths drift in and out of line with each other, so the music keeps changing.

- 21 voice types, built from open-source Eurorack synthesiser code
- 24 scales, including Yo, In, Hirajoshi, Kumoi, pentatonics and the modes
- Per-orbit filter, ADSR envelope, two slow modulators, swing and melody lock
- Shared delay and reverb
- Sessions you can save, and share with anyone as a `[start]...[end]` code
- Works offline once loaded, and can be installed from the browser

## Use it

Open the web app, tap play, and touch an orbit to change its settings. The **i** buttons explain each page. Share your creations as a string of text that others can paste into their copy of the app.

## How it's built

It's a single web page (`index.html`) plus the sound engine (`macro.wasm`, run by `macro-worklet.js` in the browser's audio thread). There is no build step for the page. To rebuild the sound engine from source, see `engine/build.sh`.

## Licence

Default Ambience is free software, released under the
[GNU General Public License, version 3](LICENSE). You're welcome to study it, change it and share it;
versions you distribute must stay under the same licence, with their source code available.

If you release your own version, please give it a different name, so people don't confuse it with this one.

## Credits

The sound engine is compiled from open-source code by Emilie Gillet, used under the MIT License.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

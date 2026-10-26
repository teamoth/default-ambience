# Default Ambience

A Euclidean sequencer for ambient music, made for phones and browsers.

**▶ Play it now: [teamoth.github.io/default-ambience](https://teamoth.github.io/default-ambience/)** (works in any modern browser, on phones and computers)

**Android:** download the app from [Releases](https://github.com/teamoth/default-ambience/releases) (the `.apk` file). A Google Play version is on the way.

Four (or eight) **orbits** each loop a rhythm: a number of hits spread as evenly as possible around a number of steps. Every hit picks a note from the scale you choose, so the melodies are random but always in key. Orbits of different lengths drift in and out of line with each other, so the music keeps changing.

- 21 voice types, built from open-source Eurorack synthesiser code
- 24 scales, including Yo, In, Hirajoshi, Kumoi and pentatonics
- Per-orbit filter, ADSR envelope, velocity, three modulators (LFO, random per hit, pattern position or note pitch), swing and melody lock
- MIDI output: each orbit can send its notes on its own channel (Chrome or Edge)
- Sends to master delay and reverb
- Sessions you can save, and share with anyone as a string of text
- Works offline once loaded, and can be installed from the browser

## Use it

Open the web app, tap play, and touch an orbit to change its settings. The **i** buttons explain each page. Share your creations as a string of text that others can paste into their copy of the app.

## How it's built

- **`src/app.html`**: the whole app as one self-contained page (HTML, CSS and JavaScript). This is the file to edit.
- **`scripts/build-site.py`**: turns it into the website page, `index.html`, adding the page head, the install manifest and offline support. Run `python3 scripts/build-site.py` after editing `src/app.html`, and commit both.
- **`macro.wasm`** and **`macro-worklet.js`**: the sound engine, which runs in the browser's audio thread. To rebuild it from source, see `engine/build.sh`.
- **Android app**: built with [Capacitor](https://capacitorjs.com/) by the GitHub Actions workflow in `.github/workflows/android.yml`, using the scripts in `scripts/`. Every change produces a test build on the "Android test build" release.

## Licence

Default Ambience is free software, released under the
[GNU General Public License, version 3](LICENSE). You're welcome to study it, change it and share it;
versions you distribute must stay under the same licence, with their source code available.

If you release your own version, please give it a different name, so people don't confuse it with this one.

## Credits

The sound engine is compiled from open-source code by Emilie Gillet, used under the MIT License.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

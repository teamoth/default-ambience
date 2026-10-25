# Builds the web files the Android app ships with (www/) from the website files.
# The app works offline by itself, so the website's offline service worker is left out,
# and the page is marked as running inside the app.
import os, re, shutil, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
www = os.path.join(root, "www")
shutil.rmtree(www, ignore_errors=True)
os.makedirs(www)
page = open(os.path.join(root, "index.html"), encoding="utf-8").read()
before = page
page = re.sub(r'// works offline once loaded\n.*?serviceWorker.*?\n', '', page)
page = page.replace('<script>window.DA_SITE=true;</script>', '<script>window.DA_SITE=true;window.DA_APP=true;</script>', 1)
if page == before or 'DA_APP' not in page:
    sys.exit("make-www: index.html did not have the expected markers")
open(os.path.join(www, "index.html"), "w", encoding="utf-8").write(page)
for f in ["macro.wasm", "macro-worklet.js", "manifest.webmanifest"]:
    shutil.copy(os.path.join(root, f), www)
shutil.copytree(os.path.join(root, "icons"), os.path.join(www, "icons"))
print("www/ ready")

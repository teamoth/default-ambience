# Builds the website page (index.html) from the app's source (src/app.html).
# Usage: python3 scripts/build-site.py            (from the repo folder)
#        python3 scripts/build-site.py SRC OUT     (other paths)
# src/app.html is the single source file: one self-contained page (HTML, CSS and JavaScript) that also runs
# as a preview by itself. This script adds what the website needs around it: the page head (title, icons,
# theme colour, install manifest), safe-area handling for phones, the offline service worker, and a flag
# telling the page it's on the website (so the feedback form is switched on).
import os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "src", "app.html")
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "index.html")
s = open(src).read()
s = s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
s = s.replace('<title>Default Ambience</title>\n', '', 1)
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Default Ambience</title>
<meta name="description" content="A Euclidean sequencer for ambient music, with four orbits, scales and a synth engine built from open-source Eurorack code.">
<meta name="theme-color" content="#13141d">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>
/* base reset for the standalone page */
html{-webkit-text-size-adjust:100%}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font-size:14px}
img{max-width:100%}
[hidden]{display:none!important}
/* a solid strip behind the phone's status bar, so the page doesn't scroll underneath the clock and icons */
body::before{content:"";position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top,0px);background:var(--bg,#13141d);z-index:40;pointer-events:none}
</style>
'''
i = s.index('<div class="wrap">')
page = head + s[:i] + '</head>\n<body>\n' + s[i:]
# register the offline worker just before the last closing script tag
k = page.rindex('</script>')
page = page[:k] + '''// works offline once loaded
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
''' + page[k:]
# mark this build as the website (the feedback form only works here)
j = page.index('<script>')
page = page[:j] + '<script>window.DA_SITE=true;</script>\n' + page[j:]
page += '\n</body>\n</html>\n'
open(out, 'w').write(page)
print("wrote", out)

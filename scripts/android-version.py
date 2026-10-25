# Sets the Android version from the app's own version number (APP_VERSION in index.html).
# Version "1.19" becomes versionName "1.19" and versionCode 1019 (major * 1000 + minor), so it always goes up.
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = open(os.path.join(root, "index.html"), encoding="utf-8").read()
v = re.search(r'const APP_VERSION="(\d+)\.(\d+)"', page)
if not v: sys.exit("android-version: APP_VERSION not found")
name = v.group(1) + "." + v.group(2); code = int(v.group(1)) * 1000 + int(v.group(2))
p = os.path.join(root, "android", "app", "build.gradle")
g = open(p).read()
g, n1 = re.subn(r'versionCode \d+', 'versionCode %d' % code, g)
g, n2 = re.subn(r'versionName "[^"]*"', 'versionName "%s"' % name, g)
if not (n1 and n2): sys.exit("android-version: build.gradle had no versionCode/versionName")
open(p, "w").write(g)
print("version", name, code)
if os.environ.get("GITHUB_OUTPUT"):
    open(os.environ["GITHUB_OUTPUT"], "a").write("name=%s\ncode=%d\n" % (name, code))

# Writes the Android launcher icons (classic and adaptive) from icons/icon-maskable-512.png.
import os, sys
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
res = os.path.join(root, "android", "app", "src", "main", "res")
src = Image.open(os.path.join(root, "icons", "icon-maskable-512.png")).convert("RGBA")
BG = (19, 20, 29, 255)   # #13141d, the app's dark background
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in dens.items():
    folder = os.path.join(res, "mipmap-" + d)
    os.makedirs(folder, exist_ok=True)
    # classic icon: 48dp, the whole artwork
    n = round(48 * k)
    full = src.resize((n, n), Image.LANCZOS)
    full.save(os.path.join(folder, "ic_launcher.png"))
    # round icon: the artwork clipped to a circle
    mask = Image.new("L", (n * 4, n * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    mask = mask.resize((n, n), Image.LANCZOS)
    rnd = Image.new("RGBA", (n, n), (0, 0, 0, 0)); rnd.paste(full, (0, 0), mask)
    rnd.save(os.path.join(folder, "ic_launcher_round.png"))
    # adaptive foreground: 108dp, artwork scaled so its safe zone fits Android's 66dp safe circle
    m = round(108 * k)
    fg = Image.new("RGBA", (m, m), BG)
    s = round(m * 0.76)
    fg.paste(src.resize((s, s), Image.LANCZOS), ((m - s) // 2, (m - s) // 2))
    fg.save(os.path.join(folder, "ic_launcher_foreground.png"))
values = os.path.join(res, "values")
os.makedirs(values, exist_ok=True)
open(os.path.join(values, "ic_launcher_background.xml"), "w").write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#13141D</color>\n</resources>\n')
print("icons written")

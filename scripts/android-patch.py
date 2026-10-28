# Adds the app's own Android code to the project Capacitor generates:
# background playback (a playback service with a notification) and its permissions,
# plus microphone access for looper orbits.
import os, re, shutil, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = os.path.join(root, "android", "app", "src", "main")
java = os.path.join(app, "java", "timbient", "defaultambience")
os.makedirs(java, exist_ok=True)
for f in ["MainActivity.java", "PlaybackService.java", "BackgroundPlugin.java"]:
    shutil.copy(os.path.join(root, "android-native", f), java)
mp = os.path.join(app, "AndroidManifest.xml")
m = open(mp, encoding="utf-8").read()
perms = ["android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
         "android.permission.POST_NOTIFICATIONS", "android.permission.WAKE_LOCK",
         # looper orbits can record from the microphone
         "android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS"]
add = "".join('    <uses-permission android:name="%s" />\n' % p for p in perms if p not in m)
m = m.replace("</manifest>", add + "</manifest>", 1)
if "PlaybackService" not in m:
    m = m.replace("</application>",
        '        <service android:name=".PlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>', 1)
open(mp, "w", encoding="utf-8").write(m)
print("android: background playback added")

package timbient.defaultambience;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets the page start and stop background playback, check the two phone settings that keep it running
// (notifications allowed, battery usage unrestricted), and open the right settings pages for them.
@CapacitorPlugin(name = "Background")
public class BackgroundPlugin extends Plugin {
    private static BackgroundPlugin instance;
    // Audio focus: Android's way of letting one app play at a time. Starting Default Ambience asks for it
    // (so music apps pause); when another app starts playing, Default Ambience is told and stops in turn.
    private AudioManager audio;
    private AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        String what = null;
        if (change == AudioManager.AUDIOFOCUS_LOSS) what = "loss";                       // another app is playing now
        else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) what = "pause";       // e.g. a phone call: pause, then carry on
        else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) what = "duck"; // e.g. a navigation prompt: play quieter
        else if (change == AudioManager.AUDIOFOCUS_GAIN) what = "resume";
        if (what != null) callPage("window.daAudioFocus&&window.daAudioFocus('" + what + "')");
    };

    private void requestFocus() {
        audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                    .setOnAudioFocusChangeListener(focusListener)
                    .build();
            audio.requestAudioFocus(focusRequest);
        } else {
            audio.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) audio.abandonAudioFocusRequest(focusRequest);
        else audio.abandonAudioFocus(focusListener);
    }

    private void callPage(String js) {
        if (getBridge() == null) return;
        final WebView wv = getBridge().getWebView();
        if (wv == null) return;
        wv.post(() -> wv.evaluateJavascript(js, null));
    }

    @Override
    public void load() { instance = this; }

    @PluginMethod
    public void start(PluginCall call) {
        // Android 13+: ask once to show the "playing" notification (playback works either way)
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(getContext(),
                Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4711);
        }
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), PlaybackService.class));
            requestFocus();
            call.resolve();
        } catch (Exception e) {
            call.reject("Background playback couldn't start: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), PlaybackService.class));
        abandonFocus();
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    // {notifications: true/false, battery: true/false}; battery is true when the app's battery use is Unrestricted
    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("notifications", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        r.put("battery", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        call.resolve(r);
    }

    // the first time: Android's own "Allow notifications?" question; after that, the app's notification settings
    @PluginMethod
    public void requestNotifications(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("background", Context.MODE_PRIVATE);
        boolean granted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        if (!granted && Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("asked", false)) {
            prefs.edit().putBoolean("asked", true).apply();
            ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 4712);
        } else if (!granted) {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    // called by the notification's Stop button
    static void notifyStop() {
        BackgroundPlugin p = instance;
        if (p == null || p.getBridge() == null) return;
        final WebView wv = p.getBridge().getWebView();
        if (wv == null) return;
        wv.post(() -> wv.evaluateJavascript("window.daNativeStop&&window.daNativeStop()", null));
    }
}

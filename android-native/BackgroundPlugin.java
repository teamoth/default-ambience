package timbient.defaultambience;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets the page start and stop background playback, and open the app's system settings page
// (where the battery setting lives).
@CapacitorPlugin(name = "Background")
public class BackgroundPlugin extends Plugin {
    private static BackgroundPlugin instance;

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
            call.resolve();
        } catch (Exception e) {
            call.reject("Background playback couldn't start: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), PlaybackService.class));
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

    // called by the notification's Stop button
    static void notifyStop() {
        BackgroundPlugin p = instance;
        if (p == null || p.getBridge() == null) return;
        final WebView wv = p.getBridge().getWebView();
        if (wv == null) return;
        wv.post(() -> wv.evaluateJavascript("window.daNativeStop&&window.daNativeStop()", null));
    }
}

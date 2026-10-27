package timbient.defaultambience;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

// The app's main screen. While music is playing, the page keeps running when the app is in the
// background or the screen is off (Android would otherwise pause it, which stops the sequencer).
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundPlugin.class);
        super.onCreate(savedInstanceState);
        // By default Android lowers the priority of the page's process as soon as the app is out of view,
        // which starves the audio of processing time and causes glitches in the background. Keep it important.
        if (Build.VERSION.SDK_INT >= 26 && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepRunningWhilePlaying();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepRunningWhilePlaying();
    }

    private void keepRunningWhilePlaying() {
        if (!PlaybackService.isRunning() || bridge == null) return;
        WebView wv = bridge.getWebView();
        if (wv == null) return;
        wv.onResume();
        wv.resumeTimers();
    }
}

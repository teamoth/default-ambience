package timbient.defaultambience;

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

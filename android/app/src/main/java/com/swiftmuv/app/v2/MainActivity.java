package com.swiftmuv.app.v2;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // index.html contains the complete compiled theme. Never reuse an old
        // WebView copy after the app has been rebuilt or updated.
        getBridge().getWebView().getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        getBridge().getWebView().clearCache(true);
    }
}

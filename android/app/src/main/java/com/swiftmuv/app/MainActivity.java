package com.swiftmuv.app.v2;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // index.html carries the complete compiled theme, so an old WebView copy
        // must never be reused after an update. This is a nice-to-have only:
        // never let it take the whole app down on launch.
        try {
            if (getBridge() != null) {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    WebSettings settings = webView.getSettings();
                    if (settings != null) {
                        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
                    }
                    webView.clearCache(true);
                }
            }
        } catch (Throwable ignored) {
            // A cache hint is not worth crashing the app for.
        }
    }
}

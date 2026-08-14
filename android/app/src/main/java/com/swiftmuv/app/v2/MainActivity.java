package com.swiftmuv.app.v2;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // The Android Maps SDK view is mounted behind Capacitor's WebView.
        // Keep the native host and WebView transparent so the map can be seen.
        getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        getWindow().getDecorView().setBackgroundColor(Color.TRANSPARENT);

        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(Color.TRANSPARENT);
        }
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
            getBridge().getWebView().setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }
    }
}

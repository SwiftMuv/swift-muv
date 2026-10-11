package com.swiftmuv.app;

import android.view.View;
import android.view.ViewGroup;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.maps.MapView;
import com.google.android.gms.maps.model.MapColorScheme;

/** Selects the dark cloud-style variant without replacing Capacitor's map. */
@CapacitorPlugin(name = "BookingMapTheme")
public class BookingMapThemePlugin extends Plugin {
    @PluginMethod
    public void applyDark(PluginCall call) {
        String mapId = call.getString("id");
        if (mapId == null || mapId.isEmpty()) {
            call.reject("Map ID is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                View root = getBridge().getWebView().getRootView();
                View container = root.findViewWithTag(mapId);
                MapView mapView = findMapView(container);
                if (mapView == null) {
                    call.reject("Booking map is not attached");
                    return;
                }
                mapView.getMapAsync(map -> {
                    try {
                        map.setMapColorScheme(MapColorScheme.DARK);
                        call.resolve();
                    } catch (Exception error) {
                        call.reject("Could not select the dark map style", error);
                    }
                });
            } catch (Exception error) {
                call.reject("Could not access the booking map", error);
            }
        });
    }

    private MapView findMapView(View view) {
        if (view instanceof MapView) return (MapView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int index = 0; index < group.getChildCount(); index++) {
                MapView map = findMapView(group.getChildAt(index));
                if (map != null) return map;
            }
        }
        return null;
    }
}
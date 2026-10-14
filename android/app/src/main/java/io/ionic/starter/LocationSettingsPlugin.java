package io.ionic.starter;

import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationSettings")
public class LocationSettingsPlugin extends Plugin {
    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        openSettings(call, new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
        openSettings(call, intent);
    }

    private void openSettings(PluginCall call, Intent intent) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not open Android settings", error);
        }
    }
}

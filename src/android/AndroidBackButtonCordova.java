package com.osforge.androidbackbutton.cordova;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.osforge.androidbackbutton.core.BackHandlerCore;

/**
 * Cordova entry point. Service name: {@code AndroidBackButton}.
 * Back presses are pushed to the callback registered with the {@code subscribe} action.
 */
public class AndroidBackButtonCordova extends CordovaPlugin {

    private BackHandlerCore core;
    private CallbackContext subscriber;

    @Override
    protected void pluginInitialize() {
        core = new BackHandlerCore(cordova.getActivity(), this::deliverBack);
    }

    private synchronized boolean deliverBack() {
        if (subscriber == null) {
            return false;
        }
        JSONObject data = new JSONObject();
        try {
            data.put("canGoBack", false);
        } catch (JSONException ignored) {
            // cannot happen
        }
        PluginResult result = new PluginResult(PluginResult.Status.OK, data);
        result.setKeepCallback(true);
        subscriber.sendPluginResult(result);
        return true;
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext cb) {
        switch (action) {
            case "isAvailable":
                cb.success(core.isSupported() ? 1 : 0);
                return true;
            case "subscribe":
                synchronized (this) {
                    subscriber = cb;
                }
                PluginResult pending = new PluginResult(PluginResult.Status.NO_RESULT);
                pending.setKeepCallback(true);
                cb.sendPluginResult(pending);
                return true;
            case "unsubscribe":
                synchronized (this) {
                    if (subscriber != null) {
                        PluginResult done = new PluginResult(PluginResult.Status.NO_RESULT);
                        done.setKeepCallback(false);
                        subscriber.sendPluginResult(done);
                    }
                    subscriber = null;
                }
                cb.success();
                return true;
            case "enable":
                core.enable();
                cb.success();
                return true;
            case "disable":
                core.disable();
                cb.success();
                return true;
            case "isEnabled":
                cb.success(core.isEnabled() ? 1 : 0);
                return true;
            case "performDefaultBack":
                core.performDefaultBack();
                cb.success();
                return true;
            case "exitApp":
                cb.success();
                core.exitApp();
                return true;
            case "minimizeApp":
                cb.success();
                core.minimizeApp();
                return true;
            default:
                return false;
        }
    }

    @Override
    public void onDestroy() {
        if (core != null) {
            core.destroy();
        }
        synchronized (this) {
            subscriber = null;
        }
        super.onDestroy();
    }
}

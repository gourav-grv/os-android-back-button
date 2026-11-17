package com.osforge.androidbackbutton.capacitor;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.osforge.androidbackbutton.core.BackHandlerCore;

/**
 * Capacitor entry point. JS name: {@code AndroidBackButton}.
 * Event: {@code backButton} with {@code { canGoBack: boolean }}.
 */
@CapacitorPlugin(name = "AndroidBackButton")
public class AndroidBackButtonPlugin extends Plugin {

    private static final String EVENT_BACK_BUTTON = "backButton";

    private BackHandlerCore core;

    @Override
    public void load() {
        core = new BackHandlerCore(getActivity(), () -> {
            if (!hasListeners(EVENT_BACK_BUTTON)) {
                return false;
            }
            JSObject data = new JSObject();
            data.put("canGoBack", bridge.getWebView() != null && bridge.getWebView().canGoBack());
            notifyListeners(EVENT_BACK_BUTTON, data, false);
            return true;
        });
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", core.isSupported());
        call.resolve(ret);
    }

    @PluginMethod
    public void enable(PluginCall call) {
        core.enable();
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        core.disable();
        call.resolve();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", core.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void performDefaultBack(PluginCall call) {
        core.performDefaultBack();
        call.resolve();
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        call.resolve();
        core.exitApp();
    }

    @PluginMethod
    public void minimizeApp(PluginCall call) {
        call.resolve();
        core.minimizeApp();
    }

    @Override
    protected void handleOnDestroy() {
        if (core != null) {
            core.destroy();
        }
        super.handleOnDestroy();
    }
}

/*
 * AndroidBackButtonOS - stack-agnostic wrapper for OutSystems (O11 + ODC).
 * Add this file as a Script in the plugin module and mark it as required by the
 * client actions / block that use it.
 *
 * Detects Capacitor (ODC + MABS 12) or Cordova (O11 MABS, older ODC) and exposes:
 *
 *   AndroidBackButtonOS.isAvailable()            -> boolean (sync). false on iOS / web.
 *   AndroidBackButtonOS.enable() / disable()     -> Promise. Global master switch.
 *   AndroidBackButtonOS.addListener('backButton', cb) -> Promise<{remove()}>
 *   AndroidBackButtonOS.removeAllListeners()     -> Promise
 *   AndroidBackButtonOS.performDefaultBack()     -> Promise. Run the back that would happen without us.
 *   AndroidBackButtonOS.exitApp() / minimizeApp()-> Promise
 *
 *   // Handler registry used by the BackButtonHandler block (one entry per block instance):
 *   AndroidBackButtonOS.register(callback)       -> id (string)
 *   AndroidBackButtonOS.unregister(id)
 *
 * Only the most recently registered handler receives a back press. Native interception
 * is on while at least one handler is registered AND the master switch is on; otherwise
 * our native callback is removed and the default/system back (with predictive back
 * animation where the OS shows one) happens.
 */
(function (global) {
    'use strict';
    if (global.AndroidBackButtonOS) return;

    var LOG = '[AndroidBackButtonOS]';

    function isAndroidUA() {
        return /android/i.test((global.navigator && global.navigator.userAgent) || '');
    }

    function nativePlugin() {
        var cap = global.Capacitor;
        if (cap && typeof cap.getPlatform === 'function' && cap.getPlatform() === 'android') {
            if (cap.Plugins && cap.Plugins.AndroidBackButton) return cap.Plugins.AndroidBackButton;
            if (typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('AndroidBackButton')) return null;
            if (typeof cap.registerPlugin === 'function') return cap.registerPlugin('AndroidBackButton');
            return null;
        }
        var cdv = global.cordova;
        if (cdv && cdv.platformId === 'android' && cdv.plugins && cdv.plugins.AndroidBackButton) {
            return cdv.plugins.AndroidBackButton;
        }
        return null;
    }

    function stackName() {
        if (global.Capacitor && global.Capacitor.getPlatform && global.Capacitor.getPlatform() !== 'web') return 'capacitor';
        if (global.cordova) return 'cordova';
        return 'none';
    }

    function noop() { return Promise.resolve(); }

    var handlers = [];         // [{id, cb}] - last one wins
    var seq = 0;
    var masterOn = true;
    var nativeOn = false;
    var nativeListener = null; // handle from addListener
    var externalListeners = []; // listeners added via addListener()

    function plugin() { return isAndroidUA() ? nativePlugin() : null; }

    function onNativeBack(data) {
        var top = handlers.length ? handlers[handlers.length - 1] : null;
        var anyExternal = externalListeners.length > 0;
        externalListeners.slice().forEach(function (cb) {
            try { cb(data || {}); } catch (e) { console.error(LOG, e); }
        });
        if (top) {
            try { top.cb(data || {}); } catch (e) { console.error(LOG, e); }
        } else if (!anyExternal) {
            api.performDefaultBack();
        }
    }

    function ensureNativeListener() {
        var p = plugin();
        if (!p || nativeListener) return Promise.resolve();
        return Promise.resolve(p.addListener('backButton', onNativeBack)).then(function (h) {
            nativeListener = h;
        });
    }

    function sync() {
        var p = plugin();
        if (!p) return Promise.resolve();
        var want = masterOn && (handlers.length > 0 || externalListeners.length > 0);
        if (want === nativeOn && !want) return Promise.resolve();
        nativeOn = want;
        if (want) {
            // Always re-call enable(): native side re-adds the callback on top of
            // Cordova's / @capacitor/app's callbacks that may have been added later.
            return ensureNativeListener().then(function () { return p.enable(); });
        }
        return Promise.resolve(p.disable());
    }

    var api = {
        version: '1.0.0',
        stack: stackName,

        isAvailable: function () { return !!plugin(); },

        enable: function () { masterOn = true; return sync(); },
        disable: function () { masterOn = false; return sync(); },
        isEnabled: function () { return nativeOn; },

        addListener: function (eventName, cb) {
            if (eventName !== 'backButton') return Promise.reject(new Error('Unsupported event ' + eventName));
            externalListeners.push(cb);
            return sync().then(function () {
                return {
                    remove: function () {
                        externalListeners = externalListeners.filter(function (l) { return l !== cb; });
                        return sync();
                    }
                };
            });
        },
        removeAllListeners: function () {
            externalListeners = [];
            handlers = [];
            var h = nativeListener;
            nativeListener = null;
            return sync().then(function () { return h ? h.remove() : undefined; });
        },

        register: function (cb) {
            var id = 'bb' + (++seq);
            handlers.push({ id: id, cb: cb });
            sync();
            return id;
        },
        unregister: function (id) {
            if (!id) return;
            handlers = handlers.filter(function (h) { return h.id !== id; });
            sync();
        },

        performDefaultBack: function () { var p = plugin(); return p ? Promise.resolve(p.performDefaultBack()) : noop(); },
        exitApp: function () { var p = plugin(); return p ? Promise.resolve(p.exitApp()) : noop(); },
        minimizeApp: function () { var p = plugin(); return p ? Promise.resolve(p.minimizeApp()) : noop(); }
    };

    global.AndroidBackButtonOS = api;
})(window);

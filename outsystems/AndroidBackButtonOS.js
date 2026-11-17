/* AndroidBackButtonOS 1.1.0 - https://github.com/gourav-grv/os-android-back-button (outsystems/AndroidBackButtonOS.js)
 * Stack-agnostic wrapper for OutSystems (O11 + ODC): detects Capacitor (MABS 12) or Cordova.
 *   isAvailable()                      -> boolean (sync); false on iOS / web / plugin missing
 *   enable() / disable()               -> Promise; global master switch
 *   addListener('backButton', cb)      -> Promise<{remove()}>;  removeAllListeners() -> Promise
 *   register(cb) -> id; unregister(id)  handler registry, most recent handler wins
 *   performDefaultBack(), exitApp(), minimizeApp() -> Promise
 *   confirm(message, title, okLabel, cancelLabel) -> Promise<boolean>
 *   status() -> {available, stack, masterEnabled, intercepting, handlerCount, listenerCount, version}
 * Native interception is on only while masterEnabled AND (a handler is registered OR a listener exists).
 */
(function (global) {
    'use strict';
    if (global.AndroidBackButtonOS && global.AndroidBackButtonOS.version >= '1.1.0') return;
    var previous = global.AndroidBackButtonOS;
    var LOG = '[AndroidBackButtonOS]';
    function logError(where) { return function (e) { console.error(LOG, where, e); }; }
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
        return 'web';
    }
    function noop() { return Promise.resolve(); }
    var handlers = [];
    var seq = 0;
    var masterOn = true;
    var nativeOn = false;
    var nativeListener = null;
    var externalListeners = [];
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
            // Re-enable every time: the native side re-adds its callback on top of
            // callbacks registered later by Cordova / @capacitor/app.
            return ensureNativeListener().then(function () { return p.enable(); })
                .catch(function (e) { nativeOn = false; throw e; });
        }
        return Promise.resolve(p.disable());
    }
    function call(method) {
        var p = plugin();
        return p ? Promise.resolve(p[method]()) : noop();
    }
    var api = {
        version: '1.1.0',
        stack: stackName,
        isAvailable: function () { return !!plugin(); },
        enable: function () { masterOn = true; return sync(); },
        disable: function () { masterOn = false; return sync(); },
        isEnabled: function () { return nativeOn; },
        status: function () {
            return {
                available: !!plugin(),
                stack: stackName(),
                masterEnabled: masterOn,
                intercepting: nativeOn,
                handlerCount: handlers.length,
                listenerCount: externalListeners.length,
                version: api.version
            };
        },
        addListener: function (eventName, cb) {
            if (eventName !== 'backButton') return Promise.reject(new Error('Unsupported event ' + eventName));
            if (typeof cb !== 'function') return Promise.reject(new Error('Callback must be a function'));
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
            if (typeof cb !== 'function') return '';
            var id = 'bb' + (++seq);
            handlers.push({ id: id, cb: cb });
            sync().catch(logError('register'));
            return id;
        },
        unregister: function (id) {
            if (!id) return;
            var before = handlers.length;
            handlers = handlers.filter(function (h) { return h.id !== id; });
            if (handlers.length !== before) sync().catch(logError('unregister'));
        },
        isRegistered: function (id) {
            return !!id && handlers.some(function (h) { return h.id === id; });
        },
        confirm: function (message, title, okLabel, cancelLabel) {
            var n = global.navigator && global.navigator.notification;
            if (n && typeof n.confirm === 'function') {
                return new Promise(function (resolve) {
                    n.confirm(String(message || ''), function (index) { resolve(index === 1); },
                        String(title || ''), [String(okLabel || 'OK'), String(cancelLabel || 'Cancel')]);
                });
            }
            return Promise.resolve(global.confirm(String(message || '')));
        },
        performDefaultBack: function () { return call('performDefaultBack'); },
        exitApp: function () { return call('exitApp'); },
        minimizeApp: function () { return call('minimizeApp'); }
    };
    // Upgrade in place if an older copy (1.0.0) was loaded first: keep its handlers.
    if (previous && typeof previous.status !== 'function') {
        try { previous.removeAllListeners(); } catch (e) { /* ignore */ }
    }
    global.AndroidBackButtonOS = api;
})(window);

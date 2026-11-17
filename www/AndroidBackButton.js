/*
 * Cordova JS module: cordova.plugins.AndroidBackButton
 * Same promise-based surface as the Capacitor plugin (window.Capacitor.Plugins.AndroidBackButton).
 */
var exec = require('cordova/exec');

var SERVICE = 'AndroidBackButton';
var listeners = [];
var subscribed = false;

function isAndroid() {
    return !!(window.cordova && window.cordova.platformId === 'android');
}

function call(action, args) {
    return new Promise(function (resolve, reject) {
        if (!isAndroid()) {
            resolve(undefined); // iOS / browser: no-op
            return;
        }
        exec(resolve, reject, SERVICE, action, args || []);
    });
}

function dispatch(data) {
    listeners.slice().forEach(function (cb) {
        try { cb(data || {}); } catch (e) { console.error('[AndroidBackButton] listener error', e); }
    });
}

function ensureSubscribed() {
    if (subscribed || !isAndroid()) return;
    subscribed = true;
    exec(function (data) { if (data !== undefined && data !== null) dispatch(data); },
         function (err) { subscribed = false; console.error('[AndroidBackButton] subscribe failed', err); },
         SERVICE, 'subscribe', []);
}

function unsubscribe() {
    if (!subscribed) return Promise.resolve();
    subscribed = false;
    return call('unsubscribe');
}

module.exports = {
    isAvailable: function () {
        if (!isAndroid()) return Promise.resolve({ available: false });
        return call('isAvailable').then(function (v) { return { available: v === 1 || v === true }; });
    },
    enable: function () { return call('enable'); },
    disable: function () { return call('disable'); },
    isEnabled: function () {
        return call('isEnabled').then(function (v) { return { enabled: v === 1 || v === true }; });
    },
    performDefaultBack: function () { return call('performDefaultBack'); },
    exitApp: function () { return call('exitApp'); },
    minimizeApp: function () { return call('minimizeApp'); },

    addListener: function (eventName, cb) {
        if (eventName !== 'backButton') {
            return Promise.reject(new Error('Unsupported event: ' + eventName));
        }
        listeners.push(cb);
        ensureSubscribed();
        var handle = {
            remove: function () {
                listeners = listeners.filter(function (l) { return l !== cb; });
                return listeners.length === 0 ? unsubscribe() : Promise.resolve();
            }
        };
        return Promise.resolve(handle);
    },
    removeAllListeners: function () {
        listeners = [];
        return unsubscribe();
    }
};

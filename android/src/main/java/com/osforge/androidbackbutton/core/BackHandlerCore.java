package com.osforge.androidbackbutton.core;

import android.app.Activity;
import android.util.Log;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.OnBackPressedDispatcher;

/**
 * Stack-independent back handling shared by the Cordova and the Capacitor plugin classes.
 *
 * <p>Android 16 (API 36) no longer calls {@code Activity.onBackPressed()} and no longer
 * dispatches {@code KEYCODE_BACK} for apps that target API 36. The only supported way to
 * intercept back is an {@link OnBackPressedCallback} registered on the activity's
 * {@link OnBackPressedDispatcher}. This class owns exactly one such callback.</p>
 *
 * <p>Ordering: the dispatcher calls the most recently added <em>enabled</em> callback first.
 * Cordova Android 15.1+ ({@code CoreAndroid}) and {@code @capacitor/app} also add callbacks,
 * possibly after ours. Every {@link #enable()} therefore removes and re-adds our callback so
 * it sits on top. {@link #disable()} removes it completely, so the next callback (or the
 * system default, including predictive back animations) takes over again.</p>
 *
 * <p>All dispatcher access happens on the UI thread.</p>
 */
public final class BackHandlerCore {

    /** Receives back presses while interception is enabled. */
    public interface Listener {
        /** @return true if a JavaScript listener received the event, false if nobody is listening. */
        boolean onBackPressed();
    }

    private static final String TAG = "AndroidBackButton";

    private final Activity activity;
    private final Listener listener;
    private OnBackPressedCallback callback;

    public BackHandlerCore(Activity activity, Listener listener) {
        this.activity = activity;
        this.listener = listener;
    }

    /** True when the host activity exposes an OnBackPressedDispatcher (AndroidX ComponentActivity). */
    public boolean isSupported() {
        return activity instanceof ComponentActivity;
    }

    /** Whether our callback is currently registered and enabled. Read on any thread. */
    public synchronized boolean isEnabled() {
        return callback != null && callback.isEnabled();
    }

    /** Registers (or re-registers on top) our callback. */
    public void enable() {
        runOnUi(() -> {
            if (!isSupported()) {
                Log.w(TAG, "Host activity is not an AndroidX ComponentActivity; back handling unavailable.");
                return;
            }
            ComponentActivity owner = (ComponentActivity) activity;
            synchronized (this) {
                if (callback != null) {
                    callback.remove();
                }
                callback = new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        boolean delivered = false;
                        try {
                            delivered = listener.onBackPressed();
                        } catch (RuntimeException e) {
                            Log.e(TAG, "Back listener failed", e);
                        }
                        if (!delivered) {
                            // Nobody listens in JS: never swallow back silently.
                            performDefaultBackOnUi();
                        }
                    }
                };
                // Lifecycle-aware: removed automatically when the activity is destroyed.
                owner.getOnBackPressedDispatcher().addCallback(owner, callback);
            }
        });
    }

    /** Removes our callback so back goes to the next handler / system again. */
    public void disable() {
        runOnUi(() -> {
            synchronized (this) {
                if (callback != null) {
                    callback.remove();
                    callback = null;
                }
            }
        });
    }

    /**
     * Runs the back behavior that would happen without us: the next registered callback
     * (e.g. Cordova's / OutSystems' in-app navigation) or the system default (finish /
     * move the root task to back). Our callback stays registered afterwards.
     */
    public void performDefaultBack() {
        runOnUi(this::performDefaultBackOnUi);
    }

    private void performDefaultBackOnUi() {
        if (!isSupported()) {
            return;
        }
        OnBackPressedDispatcher dispatcher = ((ComponentActivity) activity).getOnBackPressedDispatcher();
        OnBackPressedCallback current;
        synchronized (this) {
            current = callback;
        }
        boolean wasEnabled = current != null && current.isEnabled();
        if (wasEnabled) {
            current.setEnabled(false);
        }
        try {
            dispatcher.onBackPressed();
        } finally {
            if (wasEnabled) {
                current.setEnabled(true);
            }
        }
    }

    /** Finishes the activity (same as @capacitor/app's exitApp). */
    public void exitApp() {
        runOnUi(activity::finish);
    }

    /** Sends the task to the background without destroying the activity. */
    public void minimizeApp() {
        runOnUi(() -> activity.moveTaskToBack(true));
    }

    /** Called from the host plugin's onDestroy. */
    public void destroy() {
        disable();
    }

    private void runOnUi(Runnable r) {
        activity.runOnUiThread(r);
    }
}

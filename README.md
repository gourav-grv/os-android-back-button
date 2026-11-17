# os-android-back-button

Android back button handling for OutSystems mobile apps, **Android 16 / predictive back ready**.
One package that installs as a **Cordova plugin** (O11 MABS, older ODC builds) and as a
**Capacitor plugin** (ODC with MABS 12), with the same JavaScript API on both.

## Why this exists

On Android 16, for apps that target API 36, the system no longer calls
`Activity.onBackPressed()` and no longer sends `KeyEvent.KEYCODE_BACK`. Predictive back is on by
default ([Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)).

Older Forge components, such as the 2021 "Android back button" component and its ODC ports,
depend on that old event. On Android 16 devices (for example a Samsung S24 Ultra on One UI 8),
custom back logic like an exit confirmation stops working without any error.

This plugin uses only the AndroidX `OnBackPressedDispatcher` with an `OnBackPressedCallback`.
That is the same mechanism Cordova Android 15.1 switched to
([announcement](https://cordova.apache.org/announcements/2026/07/22/cordova-android-15.1.0.html))
and the one `@capacitor/app` uses. It does not use `onBackPressed()`, `KEYCODE_BACK`, or the
temporary `android:enableOnBackInvokedCallback="false"` opt-out.

## How it works

```
Back press ─► OnBackPressedDispatcher ─► most recently added ENABLED callback
                                          │
              ┌───────────────────────────┴──────────────────────────┐
   our callback (only while a handler is active)          otherwise: Cordova CoreAndroid /
              │                                            @capacitor/app / OutSystems runtime /
     JS "backButton" ─► AndroidBackButtonOS                system default (predictive back)
              │
     top-most BackButtonHandler block ─► OnBackButton / exit confirmation
```

- **Native side (`BackHandlerCore`, shared by both stacks):** keeps one callback.
  - `enable()` removes the callback and adds it again, so it is always the newest one. That
    way it wins over callbacks that Cordova 15.1+ or `@capacitor/app` added later.
  - `disable()` removes the callback completely, so the next handler or the system default,
    including the predictive back animation, gets the press again.
  - If no JS listener is attached, a back press passes straight through instead of being
    swallowed.
  - All dispatcher calls run on the UI thread. The callback is tied to the activity lifecycle.
- **JS side (`AndroidBackButtonOS`):** keeps a registry of handlers.
  - Each `BackButtonHandler` block registers in OnReady and unregisters in OnDestroy.
  - Only the most recently registered handler receives the press. This makes screen
    transitions safe even when the new screen's OnReady runs before the old screen's OnDestroy.
  - The native callback is on only while at least one handler is registered and the master
    switch (`EnableBackHandling` / `DisableBackHandling`) is on.

## Install in OutSystems

The source is the Git tag `v1.0.0` of https://github.com/gourav-grv/os-android-back-button.
If you fork the repo, point the URL at your fork. You can also use a published npm version
instead (see the note below).

### O11: Mobile Plugin / Library module, Extensibility Configurations

> **O11: use the legacy `plugin` format below.** It's what the `BackButton` module uses.
> Tested on 2026-11-17 with platform 11.42 and MABS 12.1 (Cordova): a build with only the
> universal format did **not** install the plugin. Service Studio accepted the JSON without
> warnings, but the platform didn't pass it to MABS, and the build log listed only the default
> OutSystems plugins. The legacy format shows the warning *"Deprecated Extensibility
> Configuration"* in Service Studio; ignore it on O11.

**Universal schema (ODC).** Not processed by O11 Cordova builds (see the note above).

```json
{
  "buildConfigurations": {
    "cordova":   { "source": { "npm": "https://github.com/gourav-grv/os-android-back-button.git#v1.0.0" } },
    "capacitor": { "source": { "npm": "https://github.com/gourav-grv/os-android-back-button.git#v1.0.0" } }
  }
}
```

**Legacy schema (required for O11).** Service Studio shows the warning *"Deprecated
Extensibility Configuration"* for it.

```json
{ "plugin": { "url": "https://github.com/gourav-grv/os-android-back-button.git#v1.0.0" } }
```

### ODC: Mobile Library, Extensibility configuration

Use the same `buildConfigurations` JSON. MABS 12 builds use the `capacitor` source and older
builds use the `cordova` source.

> **What was verified (2026-11-17).**
> - The ODC "Library (plugin) extensibility configuration JSON schema" page lists
>   `buildConfigurations.cordova.source.npm` (plus optional `variables`) and
>   `buildConfigurations.capacitor.source.npm`. Each key is required only if the other is
>   missing, and the page's example uses both together.
> - O11 Service Studio accepted the universal JSON with no validation messages, but O11
>   builds ignored it (see the O11 note above).
> - The docs describe `npm` as "a valid npm package spec". npm specs include Git URLs with a
>   `#tag`, but the OutSystems docs only show registry names. If a build can't fetch the Git
>   URL, publish to npm and use `"npm": "os-android-back-button@1.0.0"`.

## JavaScript API (`window.AndroidBackButtonOS`)

| Method | Description |
|---|---|
| `isAvailable()` | `boolean`, synchronous. `false` on iOS, on the web, or when the plugin is missing. |
| `enable()` / `disable()` | Master switch. Off removes the native callback, so the default back and the predictive animation return. |
| `addListener('backButton', cb)` | Returns `Promise<{remove()}>`. A raw listener; enables interception while it is attached. |
| `removeAllListeners()` | Removes every listener and handler. |
| `register(cb)` / `unregister(id)` | Handler registry used by the block; the most recent handler wins. |
| `performDefaultBack()` | Runs the back that would happen without this plugin (OutSystems in-app back or system back). |
| `exitApp()` | `Activity.finish()`, the same as `@capacitor/app` `exitApp`. |
| `minimizeApp()` | `moveTaskToBack(true)`. |
| `confirm(message, title, okLabel, cancelLabel)` | `Promise<boolean>`. Uses `navigator.notification.confirm` when cordova-plugin-dialogs is present, otherwise `window.confirm`. |
| `status()` | `{available, stack, masterEnabled, intercepting, handlerCount, listenerCount, version}` |
| `isRegistered(id)` | Whether a handler id is still registered. |

The native plugin is also available directly as `Capacitor.Plugins.AndroidBackButton` or
`cordova.plugins.AndroidBackButton`. It has the same methods except `register` / `unregister`,
and every method returns a Promise.

## OutSystems public elements

| Element | Purpose |
|---|---|
| Block `BackButtonHandler` | Inputs: `Enabled` (default True), `ShowExitConfirmation` (default False), `ExitConfirmationText`, `ExitConfirmationTitle`, `ConfirmButtonLabel`, `CancelButtonLabel`. Event: `OnBackButton`. It registers on OnReady, re-registers only when `Enabled` changes, and unregisters on OnDestroy. Extra back presses are ignored while the exit dialog is open. |
| `CheckBackButtonPlugin` | Output `IsAvailable`. |
| `GetBackButtonStatus` | Outputs `IsAvailable`, `IsMasterEnabled`, `IsIntercepting`, `Platform`, `ActiveHandlerCount`, `WrapperVersion`. |
| `EnableBackHandling` / `DisableBackHandling` | Global master switch. |
| `ExitApp`, `MinimizeApp` | Close the app or send it to the background. |
| `TriggerDefaultBack` | Call it in an `OnBackButton` handler to let this one press through. |

The JavaScript of every node is in [docs/OUTSYSTEMS.md](docs/OUTSYSTEMS.md).

## Conflicts with other back handlers

| Handler | When its callback is active | Interaction |
|---|---|---|
| **Cordova Android 15.1+ `CoreAndroid`** | Only while JS has a `document` `backbutton` listener (the OutSystems runtime usually adds one for in-app back). | Ours is added again on top on every `enable()`, so it wins while enabled. `performDefaultBack()` and `disable()` hand the press back to it, which keeps OutSystems in-app navigation working. |
| **`@capacitor/app`** | From plugin load, **always enabled** unless `disableBackButtonHandler: true` is set (7.1+), or until `toggleBackButtonHandler({enabled:false})` is called. | Same: ours is added on top on `enable()`. Note that its callback stays enabled even with no JS listener. In that case it only calls `webView.goBack()`, and at the root it **swallows back**: the app doesn't exit and no predictive back-to-home animation plays. |

**`@capacitor/app` compared with this plugin.** `@capacitor/app` is Android 16 safe, because it
uses `OnBackPressedCallback`. However, it intercepts back for the whole lifetime of the app,
and its `backButton` listener has no per-screen ownership. This plugin intercepts only while a
handler is active, passes the press through when nobody listens, and lets each screen own back
through the block.

## Platform and SDK

- **Android:**
  - minSdk defaults to 24 and compile/target SDK to 36.
  - With Capacitor, the host project's `rootProject.ext` values win.
  - With Cordova, MABS sets them; check the MABS release notes for your version.
  - The plugin depends on `androidx.activity:activity` 1.9.3, which is normally already
    present through AppCompat.
- **iOS:** there is no native code.
  - The Capacitor CLI skips the plugin on iOS because the `capacitor` manifest has no `ios`
    entry.
  - Cordova installs only the JS module.
  - `isAvailable()` returns `false`, so iOS builds are not affected.

## Known limitations

- **Predictive back-to-home on screens without the block** depends on the OutSystems runtime
  and the native stack, not on this plugin. If the runtime keeps a `backbutton` listener, Cordova
  keeps its callback enabled and the OS shows no back-to-home preview. This plugin never adds to
  that while it is disabled.
- **Callbacks added later win.** If another library adds a callback after ours, that callback
  wins until the next `enable()`. The next `enable()` happens on the next block registration or
  master-switch change.
- **The exit confirmation uses `window.confirm`.** For a styled dialog, set
  `ShowExitConfirmation = False`, handle `OnBackButton` yourself, and call `ExitApp`.
- **Web content in a WebView gets no in-app predictive back animation.** That is expected
  Android behavior.

## Testing checklist

- [ ] **Android 16 device, app targeting API 36, gesture navigation:**
  - The block's `OnBackButton` fires.
  - The exit confirmation shows on the home screen.
- [ ] **Android 16 device, API 36, 3-button navigation:** same checks as above.
- [ ] **Android 13/14 device:** the same behavior (the old path must keep working).
- [ ] **Navigation between screens:**
  - List → Detail → back: Detail's handler fires.
  - After leaving Detail, its block is unregistered, and List or Home receives back.
- [ ] **Turning handling off:**
  - `Enabled = False` or `DisableBackHandling` brings back the default back behavior and the
    system animation.
  - `EnableBackHandling` restores interception.
- [ ] **`TriggerDefaultBack`** in a handler performs the normal OutSystems back.
- [ ] **Home screen exit confirmation:**
  - Cancel keeps the app open.
  - OK closes it.
  - Reopen from recents, then minimize and resume; back handling still works.
- [ ] **Cordova build** (O11 MABS) and **Capacitor build** (ODC MABS 12).
- [ ] **iOS build** succeeds and `CheckBackButtonPlugin` returns False.
- [ ] **Together with `@capacitor/app`** installed: our handler wins while enabled.

## Migrating from the old "Android back button" component

See [docs/FORGE.md](docs/FORGE.md#migrating-from-android-back-button).

## Repository layout

```
plugin.xml                     Cordova manifest
package.json                   npm + "capacitor" manifest
www/AndroidBackButton.js       Cordova JS module (cordova.plugins.AndroidBackButton)
src/android/…Cordova.java      Cordova plugin class
android/                       Capacitor Gradle module
  …/core/BackHandlerCore.java  shared native logic (also compiled into Cordova builds)
  …/capacitor/…Plugin.java     Capacitor plugin class (@CapacitorPlugin "AndroidBackButton")
outsystems/AndroidBackButtonOS.js  OutSystems wrapper (the Script in the module)
docs/                          OutSystems JS snippets, ODC spec, Forge text, demo spec
```

## License

MIT

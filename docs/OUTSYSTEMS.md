# OutSystems implementation (O11 module `BackButton` and the ODC Mobile Library)

The O11 module `BackButton` already contains everything below; it was built through the
Service Studio MCP. For ODC, create a **Mobile Library** called `BackButton` and repeat the
same elements in ODC Studio. Every public element, parameter and event has a description in
the module.

## 1. Extensibility configuration

Use the universal `buildConfigurations` JSON from the README.

## 2. Wrapper script `AndroidBackButtonOS` (Public)

Paste [`outsystems/AndroidBackButtonOS.js`](../outsystems/AndroidBackButtonOS.js) (version 1.1.0)
into it. Add the script to the module's Required Scripts and to the block's Required Scripts.

The same code is also the JavaScript of the **private** client action `EnsureWrapper` (one JS
node, `DefineWrapper`). Every public action and the block call `EnsureWrapper` first, so the
API works on screens that have no `BackButtonHandler` block. The code has a guard and runs only
once.

## 3. Client actions (all Public except EnsureWrapper)

Every action follows this flow:

```
Start → EnsureWrapper → JS node → (Assign outputs) → End
```

### CheckBackButtonPlugin

- Output parameter: `IsAvailable` (Boolean)

```js
$parameters.IsAvailable = !!(window.AndroidBackButtonOS && window.AndroidBackButtonOS.isAvailable());
```

### GetBackButtonStatus (new in 1.1.0)

| Output | Type | Meaning |
|---|---|---|
| `IsAvailable` | Boolean | The native plugin is present and the app runs on Android. |
| `IsMasterEnabled` | Boolean | State of the global master switch. |
| `IsIntercepting` | Boolean | The native callback is registered right now. |
| `Platform` | Text | `capacitor`, `cordova` or `web`. |
| `ActiveHandlerCount` | Integer | Number of registered `BackButtonHandler` blocks. |
| `WrapperVersion` | Text | Version of the JS wrapper. |

```js
var api = window.AndroidBackButtonOS;
var s = api && api.status ? api.status() : { available: false, stack: 'web', masterEnabled: false, intercepting: false, handlerCount: 0, version: '' };
$parameters.IsAvailable = !!s.available;
$parameters.IsMasterEnabled = !!s.masterEnabled;
$parameters.IsIntercepting = !!s.intercepting;
$parameters.Platform = s.stack || 'web';
$parameters.ActiveHandlerCount = s.handlerCount || 0;
$parameters.WrapperVersion = s.version || '';
```

### EnableBackHandling / DisableBackHandling / ExitApp / MinimizeApp / TriggerDefaultBack

The JS node is asynchronous (it uses `$resolve`). For the other actions, replace `enable` with
`disable`, `exitApp`, `minimizeApp` or `performDefaultBack`.

```js
var api = window.AndroidBackButtonOS;
if (!api || !api.isAvailable()) { $resolve(); return; }
api.enable().then(function () { $resolve(); }, function (e) { console.error('[AndroidBackButton] enable failed', e); $resolve(); });
```

## 4. Block `BackButtonHandler` (Public, required script `AndroidBackButtonOS`)

| Element | Name | Type / default |
|---|---|---|
| Input | `Enabled` | Boolean, default `True` |
| Input | `ShowExitConfirmation` | Boolean, default `False` |
| Input | `ExitConfirmationText` | Text, default `"Do you want to exit the app?"` |
| Input | `ExitConfirmationTitle` | Text, default `"Exit app"` (1.1.0) |
| Input | `ConfirmButtonLabel` | Text, default `"Exit"` (1.1.0) |
| Input | `CancelButtonLabel` | Text, default `"Cancel"` (1.1.0) |
| Event | `OnBackButton` | not mandatory, no parameters |
| Local variables | `HandlerId` (Text), `IsConfirming` (Boolean) | |
| OnReady | → `Register` | |
| OnParametersChanged | → `OnParametersChangedHandler` | re-registers only when `Enabled` changed |
| OnDestroy | → `Unregister` | |

Notes on the dialog inputs:

- The title and button labels appear only when the app includes `cordova-plugin-dialogs`
  (`navigator.notification`).
- Without that plugin, the browser `window.confirm` dialog is used, which can only show the
  message text.

### Register

- Flow: Start → EnsureWrapper → JS `RegisterHandler` → Assign `HandlerId` → End
- JS inputs: `CurrentId = HandlerId`, `Enabled = Enabled`

```js
var api = window.AndroidBackButtonOS;
$parameters.HandlerId = '';
if (!api) { return; }
if ($parameters.CurrentId) { api.unregister($parameters.CurrentId); }
if ($parameters.Enabled && api.isAvailable()) {
    $parameters.HandlerId = api.register(function () { $actions.HandleBack(); });
}
```

### OnParametersChangedHandler

```
If Enabled <> (HandlerId <> "")  →  Register  →  End
else                             →  End
```

This means changing a text input never moves the block above a handler that was shown more
recently.

### Unregister

```js
if (window.AndroidBackButtonOS && $parameters.Id) { window.AndroidBackButtonOS.unregister($parameters.Id); }
```

### HandleBack

```
Start → If ShowExitConfirmation
          True  → If IsConfirming → End            (ignore extra presses while the dialog is open)
                  else → IsConfirming = True → JS ConfirmExit → IsConfirming = False
                         → If ConfirmExit.Confirmed → ExitApp → End  /  End
          False → Trigger OnBackButton → End
```

`ConfirmExit` is asynchronous. Inputs: `Message`, `Title`, `OkLabel`, `CancelLabel`.

```js
var api = window.AndroidBackButtonOS;
var done = function (ok) { $parameters.Confirmed = !!ok; $resolve(); };
if (api && api.confirm) {
    api.confirm($parameters.Message, $parameters.Title, $parameters.OkLabel, $parameters.CancelLabel)
        .then(done, function (e) { console.error('[AndroidBackButton] confirm failed', e); done(false); });
} else {
    done(window.confirm($parameters.Message));
}
```

## 5. Using it in an app

- **Home screen:** add `BackButtonHandler` with `ShowExitConfirmation = True`, and set the
  text, title and button labels.
- **Detail screen with custom logic:**
  1. Add `BackButtonHandler` and handle `OnBackButton` (for example, close a popup if one is
     open).
  2. Otherwise call `TriggerDefaultBack` for the normal OutSystems back, or navigate
     explicitly.
- **Temporarily hand back to the system:** call `DisableBackHandling`, then
  `EnableBackHandling` afterwards.
- **Branching per platform:** call `CheckBackButtonPlugin`. For diagnostics or adaptive UI,
  call `GetBackButtonStatus`.

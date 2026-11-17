# OutSystems implementation (O11 module `BackButton` and the ODC Mobile Library)

The O11 module `BackButton` already contains everything below; it was built through the
Service Studio MCP. For ODC, create a **Mobile Library** called `BackButton` and repeat the
same elements in ODC Studio.

## 1. Extensibility configuration

Use the universal `buildConfigurations` JSON from the README.

## 2. Script `AndroidBackButtonOS` (Public)

Paste [`outsystems/AndroidBackButtonOS.js`](../outsystems/AndroidBackButtonOS.js) into it. Then
add it to:

- the **module's Required Scripts** (in O11: module properties → Scripts)
- the **block's Required Scripts**

Every JS node below checks for `window.AndroidBackButtonOS`, so a missing script degrades to
"not available" instead of throwing an error.

## 3. Client actions (all Public)

### CheckBackButtonPlugin

- Output parameter: `IsAvailable` (Boolean)
- Flow: Start → JS `CheckPlugin` (output `IsAvailable`) → Assign `IsAvailable = CheckPlugin.IsAvailable` → End

```js
$parameters.IsAvailable = !!(window.AndroidBackButtonOS && window.AndroidBackButtonOS.isAvailable());
```

### EnableBackHandling / DisableBackHandling / ExitApp / MinimizeApp / TriggerDefaultBack

- Flow: Start → JS `CallPlugin` → End
- The node is asynchronous: it uses `$resolve`.
- Replace `enable` with `disable`, `exitApp`, `minimizeApp` or `performDefaultBack` for the
  other actions.

```js
var api = window.AndroidBackButtonOS;
if (!api || !api.isAvailable()) { $resolve(); return; }
api.enable().then(function () { $resolve(); }, function (e) { console.error('[AndroidBackButton] enable failed', e); $resolve(); });
```

## 4. Block `BackButtonHandler` (Public, required script `AndroidBackButtonOS`)

| Element | Name | Type / default |
|---|---|---|
| Input | `Enabled` | Boolean, not mandatory, default `True` |
| Input | `ShowExitConfirmation` | Boolean, not mandatory, default `False` |
| Input | `ExitConfirmationText` | Text, not mandatory, default `"Do you want to exit the app?"` |
| Event | `OnBackButton` | not mandatory, no parameters |
| Local variable | `HandlerId` | Text |
| OnReady | → `Register` | |
| OnParametersChanged | → `Register` | |
| OnDestroy | → `Unregister` | |

### Register (block client action)

- Flow: Start → JS `RegisterHandler` → Assign `HandlerId = RegisterHandler.HandlerId` → End
- JS inputs: `CurrentId = HandlerId`, `Enabled = Enabled`
- JS output: `HandlerId` (Text)

```js
var api = window.AndroidBackButtonOS;
$parameters.HandlerId = '';
if (!api) { return; }
if ($parameters.CurrentId) { api.unregister($parameters.CurrentId); }
if ($parameters.Enabled && api.isAvailable()) {
    $parameters.HandlerId = api.register(function () { $actions.HandleBack(); });
}
```

### Unregister (block client action)

- Flow: Start → JS `UnregisterHandler` (input `Id = HandlerId`) → Assign `HandlerId = ""` → End

```js
if (window.AndroidBackButtonOS && $parameters.Id) { window.AndroidBackButtonOS.unregister($parameters.Id); }
```

### HandleBack (block client action)

```
Start → If ShowExitConfirmation
          True  → JS ConfirmExit (in Text = ExitConfirmationText, out Confirmed)
                    → If ConfirmExit.Confirmed
                         True  → ExitApp (client action) → End
                         False → End
          False → Trigger Event OnBackButton → End
```

```js
$parameters.Confirmed = window.confirm($parameters.Text);
```

## 5. Using it in an app

- **Home screen:** add `BackButtonHandler` with `ShowExitConfirmation = True` and
  `ExitConfirmationText = "Exit the app?"`.
- **Detail screen with custom logic:**
  1. Add `BackButtonHandler` and handle `OnBackButton` (for example, close a popup if one is
     open).
  2. Otherwise call `TriggerDefaultBack` to get the normal OutSystems back, or navigate
     explicitly.
- **Temporarily hand back to the system:** call `DisableBackHandling` (for example while a
  native picker is open), then `EnableBackHandling` afterwards.
- **Branching per platform:** call `CheckBackButtonPlugin` and branch on `IsAvailable`
  (false on iOS and in the browser).

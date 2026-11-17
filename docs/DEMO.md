# Demo app: `BackButtonDemo` (single page)

- **Dependencies:** `BackButton` (the `BackButtonHandler` block and every client action,
  including `GetBackButtonStatus`).
- **Theme:** glassmorphism in red and black, with class-based CSS in the theme stylesheet
  (`bb-glass`, `bb-hero`, `bb-chip`, `bb-btn`, `bb-stat`, `bb-panel`, `bb-log`, `bb-footer`).
- **Footer:** `Common\Layout` shows *"Made with ❤️ using OutSystems."* inside the scrolling
  content area.

## Screen `Home`

### Data and state

- **Static entity `Item`:** 10 records, loaded by aggregate `GetItems`.
- **OnInitialize:** `CheckBackButtonPlugin`.
- **OnReady:** `RefreshStatus`, which calls `GetBackButtonStatus`.
- **Local variables:**
  - From `GetBackButtonStatus`: `IsAvailable`, `Platform`, `IsIntercepting`,
    `IsMasterEnabled`, `HandlerCount`, `WrapperVersion`.
  - Panel and edit state: `IsPanelOpen`, `SelectedLabel`, `IsEditing`.
  - `CustomBack` (default True), bound to the block's `Enabled` input.
  - Event log: `BackPressCount`, `LastEvent`.

### Block `BackButtonHandler`

| Input / event | Value |
|---|---|
| `Enabled` | `CustomBack` |
| `ShowExitConfirmation` | `not IsPanelOpen` (changes at runtime) |
| `ExitConfirmationText` | `"Do you want to exit BackButtonDemo?"` |
| `ExitConfirmationTitle` | `"Leave the app?"` |
| `ConfirmButtonLabel` / `CancelButtonLabel` | `"Exit"` / `"Stay"` |
| `OnBackButton` | → `HandleBack` |

### Back behavior

| State | Back press does |
|---|---|
| No panel open | Exit confirmation (custom title and labels) |
| Panel open, edit mode ON | `HandleBack` cancels edit mode; the panel stays open |
| Panel open, edit mode OFF | `HandleBack` closes the panel |
| `Enabled = False` or `DisableBackHandling` | System default back (on the first screen, the app goes to the background) |

Each handled press increments `BackPressCount` and writes a timestamped line to `LastEvent`.

### Cards, from top to bottom

1. **Hero:** chips for plugin status, platform, and "Back now: …", which describes what the
   next back press will do.
2. **"Running without the native plugin" alert:** shown when `not IsAvailable`. This is the
   error scenario.
3. **Selected item panel:** shown when `IsPanelOpen`, with Toggle edit mode and Close panel.
4. **Items list:** a tap runs `SelectItem(ItemLabel)`, which opens the panel.
5. **OnBackButton event log and live status:** count, intercepted, master switch, handlers,
   plugin, wrapper version, and the last event.
6. **Controls:** Toggle Enabled, Refresh status, Disable all, Enable all, Default back
   (`TriggerDefaultBack`), Minimize app, and Exit app (`ExitApp` with no confirmation).

## Test on a device

1. **Exit confirmation:** press back with no panel open. Expect "Leave the app?" with
   Exit / Stay.
2. **Close the panel:** open an item, press back. The panel closes, and the log shows
   `OnBackButton #n: panel '…' closed`.
3. **Cancel edit mode:** open an item, turn edit mode on, press back. Edit mode is cancelled;
   press back again and the panel closes.
4. **System back:** press Toggle Enabled (or Disable all), then press back. The system back
   happens (the app goes to the background). Afterwards, press Enable all and Toggle Enabled.
5. **Both navigation modes:** repeat with gesture navigation and 3-button navigation, on
   Android 16 and on Android 13/14.

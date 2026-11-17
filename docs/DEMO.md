# Demo app spec: `BackButtonDemo` (O11 Mobile app or ODC Mobile app)

Dependencies: `BackButton` (the block and all client actions).

## Screen `Home` (default screen)

- **Local variable `IsAvailable`** (Boolean).
- **OnInitialize:** call `CheckBackButtonPlugin`, then assign `IsAvailable`.
- **Content:**
  - Title "Items".
  - A List of 10 items, from a local static or client entity `Item` (Id, Title).
  - Tapping an item navigates to `Detail(ItemId)`.
- **Status text:** `If(IsAvailable, "Back button plugin active", "Plugin not available (iOS/web)")`
- **Block instance:** `BackButtonHandler` with
  - `Enabled = True`
  - `ShowExitConfirmation = True`
  - `ExitConfirmationText = "Do you want to exit BackButtonDemo?"`

**Expected:** back on Home shows the confirm dialog. OK closes the app; Cancel stays.

## Screen `Detail` (input `ItemId`)

- **Local variables:**
  - `IsEditing` (Boolean), toggled by a button.
  - `CustomBack` (Boolean, default True), bound to a switch labeled "Intercept back".
- **Block instance:** `BackButtonHandler` with
  - `Enabled = CustomBack`
  - `ShowExitConfirmation = False`
  - Handler `OnBackButton` → screen action `DetailBack`
- **Screen action `DetailBack`:**
  - If `IsEditing` → Assign `IsEditing = False`, then show the feedback message "Edit cancelled".
    That press does not navigate.
  - Else → `TriggerDefaultBack` (normal OutSystems back to Home).
- **Buttons:**
  - "Disable all back handling" → `DisableBackHandling`
  - "Enable" → `EnableBackHandling`
  - "Minimize" → `MinimizeApp`

**Expected:**

- Back while editing cancels the edit.
- Back otherwise returns to Home, and Home's handler is active again (exit confirmation).
- With "Intercept back" off, or after `DisableBackHandling`, the default back and the system
  animation apply.

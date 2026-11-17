# Changelog

## 1.1.0 (OutSystems module + JS wrapper; native plugin unchanged, still tag v1.0.0 for extensibility)

### Fixed
- **Public client actions now work without a `BackButtonHandler` block on the screen.** A new
  private `EnsureWrapper` action loads the JS wrapper on demand. Before this,
  `CheckBackButtonPlugin` could return False on Android, and the other actions did nothing.
- **Changing a block input no longer moves the block above a more recently shown handler.** The
  block now re-registers only when `Enabled` changes.
- **The exit confirmation dialog can no longer open twice** when back is pressed again while it
  is showing.
- **Wrapper errors are handled.** Rejections from `register` / `unregister` are caught and
  logged. A failed native `enable()` no longer leaves the wrapper reporting that interception
  is on.

### Added
- `GetBackButtonStatus` client action, with outputs `IsAvailable`, `IsMasterEnabled`,
  `IsIntercepting`, `Platform`, `ActiveHandlerCount` and `WrapperVersion`.
- Block inputs `ExitConfirmationTitle`, `ConfirmButtonLabel` and `CancelButtonLabel`. They are
  used by the native dialog (cordova-plugin-dialogs), which replaces `window.confirm` when it
  is available.
- Wrapper API additions: `status()`, `confirm()` and `isRegistered()`.
- Descriptions on every public element, parameter and event.

## 1.0.0
- First release: a Cordova and Capacitor plugin built on AndroidX `OnBackPressedDispatcher`,
  ready for Android 16 and predictive back.

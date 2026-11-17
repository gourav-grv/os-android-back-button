# Forge listing text

## Name
Android Back Button (Android 16 ready)

## Short description
Handle the Android back button and back gesture per screen: custom actions, exit confirmation,
exit or minimize the app. **Android 16 / predictive back ready.** Works on O11 and ODC, with
both Cordova and Capacitor (MABS 12) builds.

## Details

**Android 16 / predictive back ready.**

From Android 16, apps that target API 36 no longer receive `onBackPressed()` or the back key
event, so components built on them stop working without any error. This component uses
Android's supported AndroidX `OnBackPressedDispatcher` API. It works on Android 7 through
Android 16+, with gesture and 3-button navigation.

- **`BackButtonHandler` block.** Drop it on a screen and handle `OnBackButton`, or switch on
  `ShowExitConfirmation` for the home screen. Each screen controls back on its own. The block
  unregisters when you leave the screen.
- **When nothing is handling back,** the default back behavior and the system's predictive back
  animation stay untouched.
- **Client actions:**
  - `CheckBackButtonPlugin`
  - `EnableBackHandling` / `DisableBackHandling`
  - `ExitApp` / `MinimizeApp`
  - `TriggerDefaultBack`
- **Platforms:**
  - One plugin for **Cordova** (O11 MABS, older ODC builds) and **Capacitor** (ODC MABS 12).
  - iOS: safe no-op.
- **Open source** (MIT): <https://github.com/YOUR-ACCOUNT/os-android-back-button>

## Migrating from "Android back button"

1. Remove the old component's dependency and delete its block instances and actions from your
   screens.
2. Install this component and add a dependency to `BackButton` (O11) or the `BackButton`
   library (ODC).
3. Map the old elements to the new ones:
   - Old global "on back pressed" logic → put a `BackButtonHandler` block on each screen that
     needs custom back, and move the logic into its `OnBackButton` handler.
   - Old exit confirmation on the home screen → `BackButtonHandler` with
     `ShowExitConfirmation = True`.
   - Old "enable/disable back" → the block's `Enabled` input (per screen) or
     `EnableBackHandling` / `DisableBackHandling` (global).
   - Old "exit app" action → `ExitApp`.
4. On screens without custom logic, use no block. Back then behaves as standard OutSystems back.
5. Rebuild the mobile package, for both API 36 and older targets, and run the testing checklist
   in the README on an Android 16 device and an Android 13/14 device.

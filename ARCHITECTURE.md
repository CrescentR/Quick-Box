# QuickBox Architecture

QuickBox follows a frontend experience layer plus Rust capability layer model.

## Frontend

- Launcher UI
- Command input and command list
- Builtin tool views
- Settings and plugin manager shells
- Command and plugin registries
- Zustand state stores
- Typed Tauri command wrappers under `src/api`

## Rust Core

- Window management
- Global shortcut registration
- Tray integration
- Clipboard access
- SQLite storage
- Local config
- Security and permission boundary
- Platform-specific behavior under `src-tauri/src/platform`

## Plugin Model

Every tool is a plugin. Builtin tools are loaded through `loadBuiltinPlugins`, registered in `PluginRegistry`, and their commands are registered in `CommandRegistry`.

Plugin views are React `ComponentType` values. `LauncherPage` asks `PluginRegistry` for the active view component and renders it dynamically.

Plugins must not call Tauri APIs directly for sensitive capabilities. They use typed frontend wrappers, and the wrappers call Rust commands.

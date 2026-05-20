# QuickBox Architecture

QuickBox is a lightweight desktop launcher built with Tauri 2, React, TypeScript, Rust, and SQLite.

## Architecture Principle

Frontend is the experience layer.
Rust is the system and capability layer.
Plugins are capability consumers and must not access sensitive system APIs directly.

## Frontend Responsibilities

- Launcher UI
- Command input
- Command list rendering
- Tool views
- Settings page
- Plugin manager UI
- Lightweight builtin tool logic

## Rust Core Responsibilities

- Global shortcuts
- Window show/hide
- Window focus
- System tray
- Clipboard access
- SQLite storage
- Local app config
- Plugin permission validation
- Platform-specific behavior

## Plugin Rules

- All tools must be registered as plugins.
- Builtin tools are also plugins.
- LauncherPage must not directly import concrete tools.
- Commands are discovered from PluginRegistry.
- Sensitive APIs must go through Rust commands.
- Plugins declare permissions.
- Permission checks are performed by Rust.

## V0.1 Scope

- Builtin plugin loading only
- No external plugin execution
- No plugin market
- No user account
- No sync
- No cloud service

## Future Scope

- Local plugin loading
- Plugin package installation
- Plugin signature verification
- Plugin market
- Developer upload platform
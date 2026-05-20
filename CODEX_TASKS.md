# Codex Tasks

## Phase 0

- Create Tauri 2 + React + TypeScript project.
- Use pnpm.
- Add project structure.
- Add README, architecture document, and task document.

## Phase 1

- Add launcher window commands.
- Register `Alt+Space` global shortcut in Rust.
- Hide launcher with `Esc` through Rust command.

## Phase 2

- Implement command types.
- Implement `CommandRegistry`.
- Implement command search and runner.

## Phase 3

- Implement plugin types.
- Implement `PluginRegistry`.
- Implement `BuiltinPluginLoader`.
- Register builtin plugins.

## Phase 4

- Add JSON, timestamp, Base64, and UUID builtin plugins.
- Ensure each plugin has `index.ts`, commands, and views.

## Phase 5

- Render plugin views dynamically through `PluginRegistry.getView`.

import type { Command } from './command-types'

export class CommandRegistry {
  private readonly commands = new Map<string, Command>()

  register(command: Command) {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`)
    }

    this.commands.set(command.id, command)
  }

  registerMany(commands: Command[]) {
    commands.forEach((command) => this.register(command))
  }

  get(commandId: string) {
    return this.commands.get(commandId)
  }

  list() {
    return Array.from(this.commands.values())
  }

  clear() {
    this.commands.clear()
  }
}

export const commandRegistry = new CommandRegistry()

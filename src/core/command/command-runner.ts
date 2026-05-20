import type { Command, CommandContext } from './command-types'

export async function runCommand(command: Command, ctx: CommandContext) {
  await command.run(ctx)
}

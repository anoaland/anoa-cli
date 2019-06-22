import { RootContext } from '../../libs'

export function printCommandChooser(context: RootContext) {
  return async () => {
    const {
      commandName,
      command,
      runtime: { commands },
      prompt,
      parameters: { options },
      print: { info, table, newline, colors }
    } = context

    const childCommands = commands.filter(
      c => c.commandPath.length > 1 && c.commandPath[0] === commandName
    )

    if (options.h || options.help) {
      newline()
      info(
        `  Usage: ${colors.bold(
          `anoa ${commandName}${
            command.aliases.length ? ` (${command.aliases.join(', ')})` : ''
          } <command>`
        )}`
      )

      newline()
      info(`  ${colors.bold('Commands:')}`)
      newline()
      table(
        childCommands.map(cmd => [
          `${cmd.name}${
            cmd.aliases.length ? ` (${cmd.aliases.join(', ')})` : ''
          }`,
          cmd.description
        ])
      )

      newline()
      return
    }

    const cmds = childCommands.reduce((acc, curr) => {
      acc[curr.description] = curr
      return acc
    }, {})

    const choices = Object.keys(cmds)
    const { task } = await prompt.ask({
      name: 'task',
      message: `What would you like to do with ${commandName}?`,
      type: 'select',
      choices,
      initial: choices[0]
    })

    cmds[task].run(context)
  }
}

module.exports = {
  name: 'init',
  alias: ['i'],
  description: 'Generate new react native boilerplate',
  run: async context => {
    const {
      init,
      parameters: { first },
      print,
      prompt,
    } = context

    const projectName = first

    await init()

    if (!projectName) {
      print.warning('Usage: anoa init <project-name>')
      return process.exit(0)
    }

    if (!/^[a-z_][a-z0-9-_]+$/i.test(projectName)) {
      print.warning('Project name should be alphanumeric with no space begining with alphabet.')
      return process.exit(0)
    }

    const rni = 'React Native Init'
    const expo = 'Expo'

    const { boilerplate } = await prompt.ask([
      {
        name: 'boilerplate',
        message: 'Select boilerplate you would like to use:',
        type: 'list',
        choices: [rni, expo],
      },
    ])

    switch (boilerplate) {
      case expo:
        await context.boilerplateExpo(projectName)
        break
      case rni:
      default:
        await context.boilerplateReactNativeInit(projectName)
        break
    }
  },
}

export default {
  name: 'init',
  alias: ['i'],
  description: 'Generate new react native boilerplate',
  run: async context => {
    const { Boilerplate } = await import('../services/boilerplates')

    // generate the boilerplate
    await new Boilerplate(context).init()
  }
}

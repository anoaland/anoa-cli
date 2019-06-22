import { RootContext } from '../../tools/context'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    await context.printCommandChooser()
  }
}

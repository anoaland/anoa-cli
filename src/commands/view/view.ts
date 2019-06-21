import { RootContext } from '../../libs'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    await context.printCommandChooser()
  }
}

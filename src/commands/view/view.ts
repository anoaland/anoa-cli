import { RootContext } from '../../core/types'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    await context.promptCommands()
  }
}

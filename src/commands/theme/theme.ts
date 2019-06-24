import { RootContext } from '../../core/types'

export default {
  name: 'theme',
  alias: ['t'],
  description: 'Theme generator',
  run: async (context: RootContext) => {
    await context.promptCommands()
  }
}

import { RootContext } from '../../core/types'

export default {
  name: 'store',
  alias: ['s'],
  description: 'Store (redux) generator',
  run: async (context: RootContext) => {
    await context.promptCommands(
      'What would you like to do with store (redux)?'
    )
  }
}

import { ViewKindEnum } from '../../generators/views/types'
import { RootContext } from '../../tools/context'

export default {
  name: 'screen',
  alias: ['s'],
  hidden: true,
  description: 'Create new screen',
  run: async (context: RootContext) => {
    const { ViewService } = await import('../../services/views/view')
    const service = new ViewService(context, ViewKindEnum.screen)
    await service.run()
  }
}

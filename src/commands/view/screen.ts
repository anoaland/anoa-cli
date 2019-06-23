import { RootContext } from '../../core/types'
import { ViewKindEnum } from '../../core/types'

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

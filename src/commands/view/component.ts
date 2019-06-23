import { RootContext } from '../../core/types'
import { ViewKindEnum } from '../../core/types'

export default {
  name: 'component',
  alias: ['c'],
  hidden: true,
  description: 'Create new component',
  run: async (context: RootContext) => {
    const { ViewService } = await import('../../services/views/view')
    const service = new ViewService(context, ViewKindEnum.component)
    await service.run()
  }
}

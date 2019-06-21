import { ViewKindEnum } from '../../generators/views/types'
import { RootContext } from '../../libs'

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

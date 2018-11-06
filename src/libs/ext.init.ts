import { RootContext } from '.'

export function init(context: RootContext) {
  return async () => {
    try {
      const res = await context.system.run('yarn -v')
      context.yarn = !!res
    } catch (error) {
      context.yarn = false
    }
  }
}

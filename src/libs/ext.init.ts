import { RootContext } from '.'

export function init(context: RootContext) {
  const {
    filesystem: { exists },
    system,
  } = context
  return async () => {
    try {
      if (exists('package-lock.json')) {
        // do not use yarn if package-lock.json exists
        context.yarn = false
      } else if (exists('yarn.lock')) {
        // use yarn if if yarn.lock exists
        context.yarn = true
      } else {
        // outside project folder? use yarn as possible
        const res = await system.run('yarn -v')
        context.yarn = !!res
      }
    } catch (error) {
      context.yarn = false
    }
  }
}

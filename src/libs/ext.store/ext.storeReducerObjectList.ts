import { RootContext } from '..'
import { GluegunFileSystemInspectTreeResult } from 'gluegun-fix'

export function storeReducerObjectList(context: RootContext) {
  return async () => {
    const {
      filesystem: { inspectTree },
    } = context

    const tree = ((await inspectTree(
      'src/store/reducers',
    )) as any) as GluegunFileSystemInspectTreeResult
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'dir')
  }
}

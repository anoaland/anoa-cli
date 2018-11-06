import { fromPath } from 'ts-emitter'
import { SyntaxKind } from 'typescript'
import { RootContext } from '..'

export function storeStateList(context: RootContext) {
  return async () => {
    const {
      storeReducerObjectList,
      strings: { camelCase },
    } = context

    // collect reducer's state files
    const stateFiles = (await storeReducerObjectList())
      .filter(r => r.children && r.children.length)
      .map(r => {
        if (r.children.find(c => c.name === 'state.ts')) {
          return { name: camelCase(r.name), path: `src/store/reducers/${r.name}/state.ts` }
        }
        return undefined
      })
      .filter(s => s !== undefined)

    if (!stateFiles) {
      return undefined
    }

    let results = {}

    for (const { path, name } of stateFiles) {
      const ast = fromPath(path)

      // let stateName = ''
      let stateProps = {}

      ast.forEachChild(c => {
        if (c.kind === SyntaxKind.InterfaceDeclaration) {
          c.forEachChild(c1 => {
            // if (c1.kind === SyntaxKind.Identifier) {
            //   stateName = c1.getText()
            // } else
            if (c1.kind === SyntaxKind.PropertySignature) {
              // stateProps.push({ [c1.getChildAt(0).getText()]: c1.getChildAt(2).getText() })
              stateProps[c1.getChildAt(0).getText()] = c1.getChildAt(2).getText()
            }
          })
        }
      })

      results[name] = stateProps
    }

    return results
  }
}

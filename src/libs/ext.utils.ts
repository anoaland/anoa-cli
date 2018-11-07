import { format, resolveConfig } from 'prettier'
import * as path from 'path'
import { RootContext } from '.'
import { GluegunFileSystemInspectTreeResult } from 'gluegun-fix'
import { sortWith, ascend, prop } from 'ramda'

export function sortImport() {
  return (imports: string[]) => {
    const mapImports = imports.map(a => {
      var ss = a.split(' from ')
      let order = 1
      if (ss[1][1] !== '.') {
        order = 0
      }

      return {
        order,
        impor: ss[0],
        from: ss[1],
        res: a,
      }
    })

    const doSort = sortWith([ascend(prop('order')), ascend(prop('from')), ascend(prop('impor'))])
    return doSort(mapImports).map((a: any) => a.res)
  }
}

export function npm(context: RootContext) {
  return async (dev: boolean, args: string) => {
    const cmd = context.yarn ? `yarn add${dev ? ' -D' : ''}` : `npm install ${dev ? '-D' : '-S'}`
    await context.system.run(cmd + ' ' + args)
  }
}

export function npmAddPackages(context: RootContext) {
  return async (pacakges: string[]) => {
    await context.npm(false, pacakges.join(' '))
  }
}

export function npmAddDevPackages(context: RootContext) {
  return async (pacakges: string[]) => {
    await context.npm(true, pacakges.join(' '))
  }
}

export function npmEnsure(context: RootContext) {
  return async (dev: boolean, deps: string[]) => {
    const { packageJson, npmAddPackages, npmAddDevPackages } = context
    const { dependencies, devDependencies } = await packageJson()
    const pkgDeps = Object.keys(dev ? devDependencies : dependencies)

    const depsToAdd = []
    for (const d of deps) {
      if (pkgDeps.indexOf(d) < 0) {
        depsToAdd.push(d)
      }
    }

    if (depsToAdd.length > 0) {
      if (dev) {
        await npmAddDevPackages(depsToAdd)
      } else {
        await npmAddPackages(depsToAdd)
      }
    }
  }
}

export function packageJson(context: RootContext) {
  return async () => {
    return await context.filesystem.read('package.json', 'json')
  }
}

export function generateFiles(context: RootContext) {
  return async (
    template: string,
    files: string[],
    dest?: string,
    props?: any,
    destFile?: string,
  ) => {
    const {
      filesystem: { read, write },
      template: { generate },
    } = context

    for (const file of files) {
      const target: string = (dest || '') + (destFile || file)

      await generate({
        template: `${template}/${file}.ejs`,
        target,
        props,
      })

      if (target.endsWith('ts') || target.endsWith('tsx')) {
        const contents = await read(target)
        const options = await resolveConfig('.prettierrc')
        await write(
          target,
          format(contents, {
            ...options,
            parser: 'typescript',
          }),
        )
      }
    }
  }
}

export function relative(context: RootContext) {
  return (source: string, target: string) => {
    let result = path.relative(
      context.filesystem.cwd(path.join('src', target)).cwd(),
      context.filesystem.cwd(path.join('src', source)).cwd(),
    )
    const info = path.parse(result)
    if (info.dir.indexOf(`..`) < 0) {
      result = `.` + path.sep + result
    }
    return result.replace(/\\/g, '/')
  }
}

export function dirList(context: RootContext) {
  return async (root: string) => {
    const {
      filesystem: { inspectTree },
    } = context

    const tree = ((await inspectTree(root)) as any) as GluegunFileSystemInspectTreeResult
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'dir')
  }
}

export function fileList(context: RootContext) {
  return async (root: string) => {
    const {
      filesystem: { inspectTree },
    } = context

    const tree = ((await inspectTree(root)) as any) as GluegunFileSystemInspectTreeResult
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'file')
  }
}

export function dirNames(context: RootContext) {
  return async (root: string) => {
    const { dirList } = context

    const dirs = (await dirList(root)).map(d => '/' + d.name)
    if (dirs.length) {
      dirs.splice(0, 0, '/')
    }

    return dirs
  }
}

export function dirNamesDeep(context: RootContext) {
  const { dirList } = context

  const res = []
  let id = 0

  let parent = '/'
  let level = 0

  function iterate(parentId: number, trees: GluegunFileSystemInspectTreeResult[]) {
    trees.forEach(t => {
      const pId = id++

      let prnId = parentId
      if (parentId > -1) {
        let found = false
        while (!found) {
          const prn = res.find(p => p.id === prnId)
          if (!prn) {
            found = true
          } else {
            level++
            prnId = prn.parentId
            parent = '/' + prn.name + parent
          }
        }
      }

      res.push({ id: pId, name: t.name, parent, parentId, level })
      parent = '/'
      level = 0

      if (t.children && t.children.length) {
        iterate(pId, t.children.filter(c => c.type === 'dir'))
      }
    })
  }

  return async root => {
    const tree = await dirList(root)
    iterate(-1, tree)
    return res.map(p => p.parent + p.name)
  }
}

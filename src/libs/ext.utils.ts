import { format, resolveConfig } from 'prettier'
import * as path from 'path'
import { RootContext } from '.'

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
        await write(target, format(contents, { ...options, parser: 'typescript' }))
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

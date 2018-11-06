import { format, resolveConfig } from 'prettier'
import { GluegunRunContext } from 'gluegun'
import * as path from 'path'

module.exports = (context: GluegunRunContext) => {
  context.npm = async (dev, args) => {
    const cmd = context.yarn ? `yarn add${dev ? ' -D' : ''}` : `npm install ${dev ? '-D' : '-S'}`
    await context.system.run(cmd + ' ' + args)
  }

  context.npmAddPackages = async (pacakges: string[]) => {
    await context.npm(false, pacakges.join(' '))
  }

  context.npmAddDevPackages = async (pacakges: string[]) => {
    await context.npm(true, pacakges.join(' '))
  }

  context.npmEnsure = async (dev: boolean, deps: string[]) => {
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

  context.packageJson = async () => {
    return await context.filesystem.read('package.json', 'json')
  }

  context.generateFiles = async (template, files, dest, props, destFile) => {
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

  context.relative = (source, target) => {

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

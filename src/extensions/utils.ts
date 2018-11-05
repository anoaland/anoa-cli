module.exports = context => {
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
      template: { generate },
    } = context

    for (const file of files) {
      await generate({
        template: `${template}/${file}.ejs`,
        target: (dest || '') + (destFile || file),
        props,
      })
    }
  }
}

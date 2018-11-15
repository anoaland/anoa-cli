import { RootContext } from '.'

class Npm {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async packageJson() {
    const { filesystem, print } = this.context
    const pkg = await filesystem.read('package.json', 'json')
    if (!pkg) {
      print.error('Invalid project directory.')
      process.exit(0)
      return
    }
    return pkg
  }

  async run(command: string, args: string) {
    const cmd = `${this.context.yarn ? 'yarn' : 'npm run'} ${command} ${args}`
    await this.context.system.run(cmd)
  }

  async install(pkg: string, dev?: boolean) {
    const { yarn, system } = this.context
    const cmd = `${yarn ? 'yarn add' : 'npm install'} ${dev ? '-D' : yarn ? '' : '-S'} ${pkg}`
    await system.run(cmd)
  }

  async addPackages(packages: string[], dev: boolean) {
    await this.install(packages.join(' '), dev)
  }

  async ensurePackages(packages: string[], dev: boolean): Promise<string[]> {
    const { print } = this.context
    const { dependencies, devDependencies } = await this.packageJson()
    const pkgDeps = Object.keys(dev ? devDependencies : dependencies)

    const packagesToAdd = []
    for (const d of packages) {
      if (pkgDeps.indexOf(d) < 0) {
        packagesToAdd.push(d)
      }
    }

    if (packagesToAdd.length > 0) {
      const spinner = print.spin('Adding required packages...')
      await this.addPackages(packagesToAdd, dev)
      spinner.succeed('Required packages added.')
    }

    return packagesToAdd
  }
}

export function npm(context: RootContext) {
  return new Npm(context)
}

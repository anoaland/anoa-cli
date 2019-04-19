import { RootContext } from '../../libs'

export class Npm {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Read package.json as JSON object
   */
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

  /**
   * Runs NPM script
   * @param command script command
   * @param args script arguments
   */
  async run(command: string, args: string) {
    const cmd = `${this.context.yarn ? 'yarn' : 'npm run'} ${command} ${args}`
    await this.context.system.run(cmd)
  }

  /**
   * Install new NPM package
   * @param pkg package name
   * @param dev development package
   */
  async installPackage(pkg: string, dev?: boolean) {
    const {
      filesystem: { exists },
      system,
      print
    } = this.context

    const count = pkg.split(' ').length
    const w = `${dev ? 'development ' : ''}package${count > 1 ? 's' : ''}`
    const spinner = print.spin(`Adding ${w} into project...`)

    const yarn = exists('yarn.lock') === 'file'
    const cmd = `${yarn ? 'yarn add' : 'npm install'} ${
      dev ? '-D' : yarn ? '' : '-S'
    } ${pkg}`
    await system.run(cmd)
    spinner.succeed(`${count} ${w} were successfully added.`)
  }

  /**
   * Install new NPM packages
   * @param packages package names
   * @param dev development package
   */
  async installPackages(packages: string[], dev: boolean) {
    await this.installPackage(packages.join(' '), dev)
  }

  /**
   * Install packages if not exists
   * @param packages package names
   * @param dev development
   */
  async installPackagesIfNotExists(packages: string[], dev: boolean): Promise<string[]> {
    const { print } = this.context
    const { dependencies, devDependencies } = await this.packageJson()
    const pkgDeps = Object.keys(dev ? devDependencies : dependencies)

    const packagesToAdd = []
    for (const d of packages) {
      let pkgToFind = d
      if (d.lastIndexOf('@') > 0) {
        pkgToFind = d.split('@')[0]
      }

      if (pkgDeps.indexOf(pkgToFind) < 0) {
        packagesToAdd.push(d)
      }
    }

    if (packagesToAdd.length > 0) {
      const spinner = print.spin(`Adding ${packagesToAdd.join(', ')}...`)
      await this.installPackages(packagesToAdd, dev)
      spinner.succeed('Required packages successfully added.')
    }

    return packagesToAdd
  }
}

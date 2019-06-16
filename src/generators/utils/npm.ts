import { RootContext } from '../../libs'
import { YarnUtils } from './yarn'

export class NpmUtils {
  context: RootContext
  yarn: YarnUtils

  constructor(context: RootContext) {
    this.context = context
    this.yarn = new YarnUtils(context)
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
    const { system } = this.context
    await system.run(this.cmd(command + ' ' + args))
  }

  /**
   * Get package command (yarn or npm run)
   */
  cmd(args: string): string {
    return `${this.yarn.isYarnInstalled() ? 'yarn' : 'npm run'} ${args}`
  }

  /**
   * Install new NPM package
   * @param pkg package name
   * @param dev development package
   */
  async installPackage(pkg: string, dev?: boolean) {
    const {
      filesystem: { exists },
      print,
      system
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
  async installPackagesIfNotExists(
    packages: string[],
    dev: boolean
  ): Promise<string[]> {
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

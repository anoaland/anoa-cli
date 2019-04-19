import * as path from 'path'
import { RootContext } from '../../libs'
import { Validate } from './validate'

export class Utils {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Validate project directory.
   * If project directory is not valid then show warning and exit the process.
   * @param dir Project Directory
   */
  validateProjectDir(dir: string) {
    const val = Validate.dirName('Project directory', dir)
    if (val === true) {
      return
    }

    this.exit(val)
  }

  /**
   * Show warning message and exit the process.
   * @param message Warning message
   */
  exit(message: string) {
    this.context.print.warning(message)
    return process.exit(0)
  }

  /**
   * Detect if yarn is installed on system
   */
  isYarnInstalled() {
    let yarnInstalled = false
    try {
      yarnInstalled = !!this.context.system.run('yarn -v')
    } catch {
      yarnInstalled = false
    }

    return yarnInstalled
  }

  /**
   * Check is yarn.lock exists
   * @param dir path or directory
   */
  isYarnLockExists(dir?: string) {
    const {
      filesystem: { cwd, exists }
    } = this.context

    const ylock = dir ? cwd(`${dir}/yarn.lock`).cwd() : 'yarn.lock'
    return exists(ylock) === 'file'
  }

  /**
   * If found yarn installed on system then prompt user to use it or not.
   */
  async askToUseYarn() {
    if (!this.isYarnInstalled()) {
      return false
    }

    const {
      print: { colors }
    } = this.context

    const useYarn = await this.confirm(
      `We found ${colors.yellow(
        'yarn'
      )} installed in your system. Do you want to use ${colors.yellow(
        'yarn'
      )} instead of ${colors.yellow('npm')}?`
    )

    return useYarn
  }

  /**
   * Show (Y/n) confirm message with Y as default.
   * @param message message
   */
  async confirm(message: string) {
    const {
      prompt,
      print: { colors }
    } = this.context
    const { confirm } = await prompt.ask({
      type: 'confirm',
      name: 'confirm',
      message: message + colors.gray(' (Y/n)'),
      default: 'Y',
      initial: 'true',
      format: (res: boolean) => (res ? 'Yes' : 'No')
    })

    return confirm
  }

  /**
   * Copy asset file from assets folder into destination.
   */
  copyAssetFile(pathOrName) {
    const {
      filesystem: { cwd, copy, exists, remove },
      folder
    } = this.context

    const dest = cwd(folder.assets(pathOrName)).cwd()
    if (exists(dest)) {
      remove(dest)
    }

    copy(path.resolve(__dirname, '../../assets/', pathOrName), dest)
  }

  /**
   * Copy multiple assets from assets folder into destination.
   * @param assets asset list
   */
  copyAssetFiles(assets: string[]) {
    const { print } = this.context
    const spinner = print.spin('Adding assets...')
    for (const asset of assets) {
      this.copyAssetFile(asset)
    }
    spinner.succeed('Asset files were successfully added.')
  }

  /**
   * Get actual error message from system error object.
   * @param error system error object
   */
  getSystemErrorMessage(error: any): string {
    return this.context.print.colors.error(
      error.stderr ? error.stderr : error.toString()
    )
  }
}

import { Utils } from '.'
import { RootContext } from '../../tools/context'

export class YarnUtils {
  private static cache = {
    yarnInstalled: undefined,
    yarnLockExists: undefined
  }

  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Detect if yarn is installed on system
   */
  isYarnInstalled() {
    const { system } = this.context
    let { yarnInstalled } = YarnUtils.cache

    if (yarnInstalled !== undefined) {
      return yarnInstalled
    }

    yarnInstalled = false
    try {
      yarnInstalled = !!system.run('yarn -v')
    } catch {
      yarnInstalled = false
    }

    YarnUtils.cache.yarnInstalled = yarnInstalled
    return yarnInstalled
  }

  /**
   * Check is yarn.lock exists
   * @param dir path or directory
   */
  isYarnLockExists(dir?: string) {
    const { filesystem } = this.context
    const { yarnLockExists } = YarnUtils.cache
    if (yarnLockExists !== undefined) {
      return yarnLockExists
    }

    const { cwd, exists } = filesystem

    const ylock = dir ? cwd(`${dir}/yarn.lock`).cwd() : 'yarn.lock'
    YarnUtils.cache.yarnLockExists = exists(ylock) === 'file'
    return YarnUtils.cache.yarnLockExists
  }

  /**
   * If found yarn installed on system then prompt user to use it or not.
   */
  async askToUseYarn() {
    if (!this.isYarnInstalled()) {
      return false
    }

    const {
      print: { colors },
      parameters: { options }
    } = this.context

    if (options.yarn) {
      return true
    }

    const useYarn = await this.utils.confirm(
      colors.bold(
        `Use ${colors.yellow('yarn')} instead of ${colors.yellow('npm')}?`
      )
    )

    return useYarn
  }
}

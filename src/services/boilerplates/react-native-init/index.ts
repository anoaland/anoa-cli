import { RootContext } from '../../../libs'
import { Utils, Validate } from '../../core'
import { ReactNativeProjectBuilder, ReactNativeProjectInfo } from './builder'

export class ReactNativeInitBoilerplate {
  context: RootContext
  utils: Utils
  info: ReactNativeProjectInfo

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Initialize new react-native project
   * @param projectDir project directory (optional)
   */
  async init(projectDir: string) {
    await this.validateReactNativeInitCLI()
    await this.queryUserInput(projectDir)
    await this.runReactNativeCli()
    await this.buildProjectStructure()
    this.success()
  }

  /**
   * Query user input to get project info.
   * @param dir default project dir
   */
  private async queryUserInput(dir: string) {
    const { prompt } = this.context

    if (!dir) {
      const { projectDir } = await prompt.ask({
        name: 'projectDir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => Validate.dirName('Project directory', val)
      })
      dir = projectDir
    }

    // const { name, bundle } = await prompt.ask([
    //   {
    //     name: 'name',
    //     type: 'input',
    //     message: 'Name of project visible on the home screen (eg: Cool App)',
    //     validate: val => Validate.notEmpty('Project name', val)
    //   },
    //   {
    //     name: 'bundle',
    //     type: 'input',
    //     message: 'Bundle identifier (eg: com.cool.app)',
    //     validate: val => Validate.androidPackageName('Bundle identifier', val)
    //   }
    // ])

    this.info = {
      dir
      // name,
      // bundle
    }
  }

  /**
   * Ensure react-native-cli installed
   */
  private async validateReactNativeInitCLI() {
    const {
      system,
      print: { colors }
    } = this.context

    let hasReactNative

    try {
      hasReactNative = !!(await system.run('react-native --version'))
    } catch (error) {
      hasReactNative = false
    }

    if (!hasReactNative) {
      this.utils.exit(
        `The ${colors.yellow(
          'react-native-cli'
        )} was not found. We need this to be installed to generate the boilerplate.`
      )
    }
  }

  /**
   * Run react-native-cli to generate boilerplate
   */
  private async runReactNativeCli() {
    const { print, system } = this.context
    const { dir } = this.info

    // const useYarn = await this.utils.askToUseYarn()

    const spinner = print.spin(
      `Initializing new project on ${print.colors.yellow(
        './' + dir
      )} directory...`
    )

    try {
      const cmd = `react-native init "${dir}"`

      await system.run(cmd)

      await spinner.succeed(
        `New project were successfully initialized on ${print.colors.yellow(
          './' + dir
        )}.`
      )
    } catch (error) {
      spinner.fail(this.utils.getSystemErrorMessage(error))
      process.exit(1)
    }
  }

  /**
   * Build the project
   */
  private async buildProjectStructure() {
    const initializer = new ReactNativeProjectBuilder(this.context, this.info)
    await initializer.build()
  }

  /**
   * Print success message to user
   */
  private success() {
    const {
      print: { colors, newline, info, success },
      filesystem: { cwd }
    } = this.context
    const { dir } = this.info
    newline()
    success(`Your project is ready at ${colors.bold(cwd())}`)
    newline()
    info(colors.cyan(`Run instructions for ${colors.bold('iOS')}:`))
    info(`  • cd ${dir} && react-native run-ios`)
    info(`  - or - `)
    info(`  • Open ios/${dir}.xcodeproj in Xcode`)
    info(`  • Hit the Run button`)
    newline()
    info(colors.green(`Run instructions for ${colors.bold('Android')}:`))
    info(`  • Have an Android emulator running, or a device connected.`)
    info(`  • cd ${dir} && react-native run-android`)
    newline()
  }
}

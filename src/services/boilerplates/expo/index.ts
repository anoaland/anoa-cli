import * as semver from 'semver'
import { RootContext } from '../../../libs'
import { Utils, Validate } from '../../core'
import { ExpoProjectBuilder, ExpoProjectInfo } from './builder'

const MIN_EXPO_VERSION = '2.11.3'

export class ExpoBoilerplate {
  context: RootContext
  utils: Utils
  info: ExpoProjectInfo

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Initialize new expo project
   * @param projectDir project directory (optional)
   */
  async init(projectDir: string) {
    await this.validateExpoCli()
    await this.queryUserInput(projectDir)
    await this.runExpoCli()
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

    const { name, slug } = await prompt.ask([
      {
        name: 'name',
        type: 'input',
        message: 'Name of project visible on the home screen (eg: Cool App)',
        validate: val => Validate.notEmpty('Project name', val)
      },
      {
        name: 'slug',
        type: 'input',
        message: 'Slug or url friendly of your project (eg: cool-app)',
        validate: val => Validate.dirName('Slug or url', val)
      }
    ])

    this.info = {
      dir,
      name,
      slug
    }
  }

  /**
   * Ensure expo-cli is installed.
   * Otherwise exit the process.
   */
  private async validateExpoCli() {
    const {
      system,
      print: { colors }
    } = this.context
    let hasExpo

    try {
      hasExpo = await system.run('expo --version')
      if (semver.gt(MIN_EXPO_VERSION, hasExpo)) {
        this.utils.exit(
          `This command needs ${colors.yellow(
            'expo-cli'
          )} with minimum version ${colors.yellow(
            MIN_EXPO_VERSION
          )} to be installed.`
        )
      }
    } catch (error) {
      hasExpo = false
    }

    if (!hasExpo) {
      this.utils.exit(
        colors.error(
          `The ${colors.yellow(
            'expo-cli'
          )} was not found. Please install ${colors.yellow(
            'expo-cli'
          )} by running command ${colors.yellow(
            'npm i -g expo-cli'
          )} to generate ${colors.yellow('expo')} project.`
        )
      )
    }
  }

  /**
   * Run expo-cli to generate boilerplate.
   */
  private async runExpoCli() {
    const { print, system } = this.context
    const { dir, name } = this.info

    const useYarn = await this.utils.askToUseYarn()

    const spinner = print.spin(
      `Initializing ${print.colors.yellow(
        name
      )} project on ${print.colors.yellow('./' + dir)} directory...`
    )

    try {
      const cmd = `expo init --name "${name}" -t blank ${
        useYarn ? '--yarn' : '--npm'
      } ${dir}`

      await system.run(cmd)

      await spinner.succeed(
        `Project ${print.colors.yellow(name)} on ${print.colors.yellow(
          './' + dir
        )} were successfully initialized.`
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
    const initializer = new ExpoProjectBuilder(this.context, this.info)
    await initializer.build()
  }

  /**
   * Print success message to user
   */
  private success() {
    const {
      print,
      filesystem: { cwd }
    } = this.context
    const { dir } = this.info
    print.newline()
    print.success(`Your project is ready at ${print.colors.bold(cwd())}`)
    print.newline()
    print.info('To get started, you can type:')
    print.info(`  cd ${dir}`)
    print.info(`  ${this.utils.isYarnLockExists() ? 'yarn' : 'npm'} start`)
    print.newline()
  }
}

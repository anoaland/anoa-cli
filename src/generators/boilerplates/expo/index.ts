import { MIN_EXPO_VERSION, ProjectTypes } from '../../../config'
import { RootContext } from '../../../core/types'
import { ExpoBoilerplateArgs } from './types'

export class ExpoBoilerplateGenerator {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Ensure expo-cli is installed and the version is match.
   */
  async validate() {
    const {
      print: { colors },
      semver,
      system,
      tools
    } = this.context
    let hasExpo

    const utils = tools.utils()

    try {
      hasExpo = await system.run('expo --version')
      if (semver.gt(MIN_EXPO_VERSION, hasExpo)) {
        utils.exit(
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
      utils.exit(
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
   * Start generate boilerplate
   * @param args project info
   */
  async generate(args: ExpoBoilerplateArgs) {
    const {
      print: { spin, colors, newline, info, success },
      system,
      filesystem: { cwd },
      tools
    } = this.context
    const { dir, name } = args

    const npm = tools.npm()
    const utils = tools.utils()

    const useYarn = await npm.askToUseYarn()
    const spinner = spin(
      `Initializing ${colors.yellow(name)} project on ${colors.yellow(
        './' + dir
      )} directory...`
    )

    try {
      const cmd = `expo init --name "${name}" -t blank ${
        useYarn ? '--yarn' : '--npm'
      } ${dir}`

      // Run expo-cli to create new fresh expo project.
      await system.run(cmd)

      await spinner.succeed(
        `Project ${colors.yellow(name)} on ${colors.yellow(
          './' + dir
        )} were successfully initialized.`
      )

      process.chdir(dir)
      await this.generateConfigFiles()
      await this.updateAppJson(args)
      await this.installNpmPackages()
      this.addAssets()
      await this.generateFilesFromTemplates()

      newline()
      success(`Your project is ready at ${colors.bold(cwd())}`)
      newline()
      info('To get started, you can type:')
      info(`  cd ${dir}`)
      info(`  ${npm.cmd('start')}`)
      newline()
    } catch (error) {
      spinner.fail(utils.getSystemErrorMessage(error))
      process.exit(1)
    }
  }

  /**
   * Generate settings / config files
   */
  private async generateConfigFiles() {
    const {
      print: { spin },
      tools
    } = this.context

    const spinner = spin('Generating config files...')
    const source = tools.source()
    await source.generate(
      'root',
      '',
      ['tslint.json', 'tsconfig.json', '.jshintrc', '.prettierrc', '.anoarc'],
      {
        projectType: ProjectTypes.EXPO
      }
    )

    spinner.succeed('Config files were successfully generated.')
  }

  /**
   * update app.json
   */
  private async updateAppJson(args: ExpoBoilerplateArgs) {
    const { name, slug } = args
    const {
      print: { spin, colors },
      patching
    } = this.context

    const spinner = spin('Updating app.json...')
    await patching.update('app.json', app => {
      const { expo } = app

      // update name
      expo.name = name

      // update slug
      expo.slug = slug

      // update packagerOpts
      expo.packagerOpts = {
        ...expo.packagerOpts,
        ...{
          sourceExts: ['ts', 'tsx'],
          transformer:
            'node_modules/react-native-typescript-transformer/index.js'
        }
      }

      app.expo = expo
      return app
    })

    spinner.succeed(`The ${colors.warning('app.json')} successfully updated.`)
  }

  /**
   * Install necessary npm packages
   */
  private async installNpmPackages() {
    const npm = this.context.tools.npm()
    await npm.installPackages(
      [
        'typescript',
        'react-native-typescript-transformer',
        '@types/react',
        '@types/react-native',
        '@types/expo',
        '@types/expo__vector-icons',
        'tslib',
        'tslint',
        'tslint-config-prettier',
        'tslint-react'
      ],
      true
    )
  }

  /**
   * Add asset files
   */
  private addAssets() {
    const project = this.context.tools.project()
    project.copyAssetFiles(['logo.png', 'icon.png', 'splash.png'])
  }

  /**
   * Generate boilerplate template files
   */
  private async generateFilesFromTemplates() {
    const { print, folder, tools } = this.context
    const source = tools.source()

    const spinner = print.spin('Applying templates...')

    // generate main App.tsx file
    await source.generate('boilerplate/expo', '', [
      {
        source: 'App.tsx',
        dest: folder.src('App.tsx')
      },
      'App.js'
    ])

    // generate main screen
    const dest = folder.screens('main')
    await source.generate(
      'boilerplate/shared/main-screen',
      dest,
      ['index.tsx', 'props.ts'],
      {
        path: dest + '/index.tsx'
      }
    )
    spinner.succeed('Templates were successfully applied.')
  }
}

import { MIN_REACT_NATIVE_INIT_VERSION, ProjectTypes } from '../../../config'
import { RootContext } from '../../../tools/context'
import { Utils } from '../../utils'
import { NpmUtils } from '../../utils/npm'
import { ProjectUtils } from '../../utils/project'
import { SourceUtils } from '../../utils/source'
import { YarnUtils } from '../../utils/yarn'
import { ReactNativeBoilerplateArgs } from './types'

export class ReactNativeInitBoilerplateGenerator {
  context: RootContext
  utils: Utils
  projectUtils: ProjectUtils
  yarnUtils: YarnUtils
  sourceUtils: SourceUtils
  npmUtils: NpmUtils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.projectUtils = new ProjectUtils(context)
    this.yarnUtils = new YarnUtils(context)
    this.sourceUtils = new SourceUtils(context)
    this.npmUtils = new NpmUtils(context)
  }

  /**
   * Ensure react-native-cli is installed and the version is match.
   */
  async validate() {
    const {
      system,
      semver,
      print: { colors }
    } = this.context

    let version

    try {
      const semverRegex = require('semver-regex')
      version = await system.run('react-native --version')

      if (version) {
        if (
          semver.gt(
            MIN_REACT_NATIVE_INIT_VERSION,
            semverRegex().exec(version)[0]
          )
        ) {
          this.utils.exit(
            `This command needs ${colors.yellow(
              'expo-cli'
            )} with minimum version ${colors.yellow(
              MIN_REACT_NATIVE_INIT_VERSION
            )} to be installed.`
          )
        }
      }
    } catch (error) {
      version = false
    }

    if (!version) {
      this.utils.exit(
        `The ${colors.yellow(
          'react-native-cli'
        )} was not found. We need this to be installed to generate the boilerplate.`
      )
    }
  }

  /**
   * Start generate boilerplate
   * @param args project info
   */
  async generate(args: ReactNativeBoilerplateArgs) {
    const {
      print: { colors, spin, success, newline, info },
      system,
      filesystem: { cwd }
    } = this.context
    const { dir } = args

    // const useYarn = await this.utils.askToUseYarn()

    const spinner = spin(
      `Initializing new project on ${colors.yellow('./' + dir)} directory...`
    )

    try {
      const cmd = `react-native init "${dir}"`

      await system.run(cmd)

      await spinner.succeed(
        `New project were successfully initialized on ${colors.yellow(
          './' + dir
        )}.`
      )

      process.chdir(dir)
      await this.generateConfigFiles()
      await this.updateMetroConfig()
      await this.installNpmPackages()
      await this.addAssets()
      await this.generateTemplateFiles()

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
    } catch (error) {
      spinner.fail(this.utils.getSystemErrorMessage(error))
      process.exit(1)
    }
  }

  /**
   * Generate settings / config files
   */
  private async generateConfigFiles() {
    const {
      print: { spin }
    } = this.context

    const spinner = spin('Applying config...')
    await this.sourceUtils.generate(
      'root',
      '',
      ['tslint.json', 'tsconfig.json', '.jshintrc', '.prettierrc', '.anoarc'],
      {
        projectType: ProjectTypes.REACT_NATIVE_INIT
      }
    )

    spinner.succeed('Config successfully applied.')
  }

  /**
   * Update metro.config.js
   */
  private async updateMetroConfig() {
    const {
      print: { spin, colors },
      patching
    } = this.context

    const spinner = spin('Updating metro.config.js...')

    await patching.patch('metro.config.js', {
      after: /transformer\s?:\s?{/g,
      insert: `\nbabelTransformerPath: require.resolve('react-native-typescript-transformer'),`
    })

    await this.sourceUtils.prettify('metro.config.js')

    spinner.succeed(
      `The ${colors.warning('metro.config.js')} successfully updated.`
    )
  }

  /**
   * Install necessary npm packages
   */
  private async installNpmPackages() {
    await this.npmUtils.installPackages(
      [
        'typescript',
        'react-native-typescript-transformer',
        '@types/react',
        '@types/react-native',
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
  private async addAssets() {
    this.projectUtils.copyAssetFiles(['logo.png'])
  }

  /**
   * Generate boilerplate template files
   */
  private async generateTemplateFiles() {
    const {
      print: { spin },
      folder,
      filesystem
    } = this.context

    const spinner = spin('Applying templates...')

    // delete App.js
    await filesystem.remove('App.js')

    // replace App.js with src/App.tsx
    await this.sourceUtils.generate('boilerplate/rni', '', [
      {
        source: 'App.tsx',
        dest: folder.src('App.tsx')
      },
      'index.js'
    ])

    // generate main screen
    const dest = folder.screens('main')
    await this.sourceUtils.generate(
      'boilerplate/shared/main-screen',
      dest,
      ['index.tsx', 'props.ts'],
      {
        path: dest + '/index.tsx'
      }
    )
    spinner.succeed('Templates successfully applied.')
  }
}

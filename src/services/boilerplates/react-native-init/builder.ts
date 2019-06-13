import { RootContext } from '../../../libs'
import { Npm, Source, Utils } from '../../core'
import { ProjectTypes } from '../types'

export class ReactNativeProjectBuilder {
  context: RootContext
  npm: Npm
  utils: Utils
  info: ReactNativeProjectInfo
  source: Source

  constructor(context: RootContext, info: ReactNativeProjectInfo) {
    this.context = context
    this.npm = new Npm(context)
    this.utils = new Utils(context)
    this.source = new Source(context)
    this.info = info
  }

  /**
   * Build the boilerplate
   */
  async build() {
    const { dir } = this.info

    process.chdir(dir)
    await this.generateConfigFiles()
    await this.updateMetroConfig()
    await this.installNpmPackages()
    await this.addAssets()
    await this.generateTemplateFiles()
  }

  /**
   * Generate settings / config files
   */
  private async generateConfigFiles() {
    const { print } = this.context

    const spinner = print.spin('Applying config...')
    await this.source.generate(
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
    const { print, patching } = this.context

    const spinner = print.spin('Updating metro.config.js...')

    await patching.patch('metro.config.js', {
      after: /transformer\s?:\s?{/g,
      insert: `\nbabelTransformerPath: require.resolve('react-native-typescript-transformer'),`
    })

    await this.source.prettify('metro.config.js')

    spinner.succeed(
      `The ${print.colors.warning('metro.config.js')} successfully updated.`
    )
  }

  /**
   * Install necessary npm packages
   */
  private async installNpmPackages() {
    await this.npm.installPackages(
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
    this.utils.copyAssetFiles(['logo.png'])
  }

  /**
   * Generate boilerplate template files
   */
  private async generateTemplateFiles() {
    const { print, folder, filesystem } = this.context

    const spinner = print.spin('Applying templates...')

    // delete App.js
    await filesystem.remove('App.js')

    // replace App.js with src/App.tsx
    await this.source.generate('boilerplate/rni', '', [
      {
        source: 'App.tsx',
        dest: folder.src('App.tsx')
      },
      'index.js'
    ])

    // generate main screen
    const dest = folder.screens('main')
    await this.source.generate(
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

export interface ReactNativeProjectInfo {
  /**
   * Project directory
   */
  dir: string
}

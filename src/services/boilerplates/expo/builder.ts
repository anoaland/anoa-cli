import { ProjectTypes } from '..'
import { RootContext } from '../../../libs'
import { Npm, Source, Utils } from '../../core'

export class ExpoProjectBuilder {
  context: RootContext
  npm: Npm
  utils: Utils
  info: ExpoProjectInfo
  source: Source

  constructor(context: RootContext, info: ExpoProjectInfo) {
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
    await this.updateAppJson()
    await this.installNpmPackages()
    await this.addAssets()
    await this.generateTemplateFiles()
  }

  /**
   * Generate settings / config files
   */
  private async generateConfigFiles() {
    const { print } = this.context

    const spinner = print.spin('Generating config files...')
    await this.source.generate(
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
  private async updateAppJson() {
    const { print, patching } = this.context
    const { name, slug } = this.info

    const spinner = print.spin('Updating app.json...')
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

    spinner.succeed(
      `The ${print.colors.warning('app.json')} successfully updated.`
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
  private async addAssets() {
    this.utils.copyAssetFiles(['logo.png', 'icon.png', 'splash.png'])
  }

  /**
   * Generate boilerplate template files
   */
  private async generateTemplateFiles() {
    const { print, folder } = this.context

    const spinner = print.spin('Applying templates...')

    // generate main App.tsx file
    await this.source.generate('boilerplate/expo', '', [
      {
        source: 'App.tsx',
        dest: folder.src('App.tsx')
      },
      'App.js'
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
    spinner.succeed('Templates were successfully applied.')
  }
}

export interface ExpoProjectInfo {
  name: string
  dir: string
  slug: string
}

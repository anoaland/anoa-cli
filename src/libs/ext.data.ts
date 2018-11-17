import { RootContext } from '.'

class Data {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Ensure all required data packages installed.
   */
  async init(): Promise<boolean> {
    const { init, npm, utils } = this.context

    await init()

    const devPackages = []
    const packages = ['sqlite-ts']

    const info = await utils.projectInfo()
    if (info.preset === 'react-native-init') {
      packages.push('react-native-sqlite-storage')
      devPackages.push('@types/react-native-sqlite-storage')
    }

    const addedPackages = await npm.ensurePackages(packages, false)
    if (devPackages.length > 0) {
      await npm.ensurePackages(devPackages, true)
    }

    return addedPackages.indexOf('react-native-sqlite-storage') > -1
  }

  /**
   * Ensure models was generated and exported.
   */
  async isModelExists() {
    const {
      filesystem: { exists },
    } = this.context

    return exists('src/data/models/index.ts') === 'file'
  }

  /**
   * Create new data model.
   * @param name model name
   */
  async createModel(name: string): Promise<boolean> {
    const {
      utils,
      strings: { pascalCase, kebabCase },
    } = this.context

    const rnsqlitestorageInstalled = await this.init()
    await utils.generate(
      'shared/src/data/models',
      'src/data/models/',
      [{ source: 'model.ts', dest: `${kebabCase(name)}.ts` }],
      {
        name: pascalCase(name),
      },
    )

    await this.updateModelExports()

    return rnsqlitestorageInstalled
  }

  /**
   * Export all models.
   */
  async updateModelExports() {
    const { utils } = this.context

    const files = await utils.fileList('src/data/models')
    const exports = files
      .filter(f => f.name !== 'index.ts')
      .map(f => f.name.slice(0, f.name.length - 3))
      .sort()

    await utils.generate('shared/src/data/models', 'src/data/models/', ['index.ts'], {
      exports,
    })
  }

  /**
   * Create data provider file.
   */
  async initProvider(): Promise<boolean> {
    const {
      utils,
      filesystem: { exists },
      print,
    } = this.context

    if (exists('src/data/index.ts') === 'file') {
      return false
    }

    if (!(await this.isModelExists())) {
      return false
    }

    const info = await utils.projectInfo()

    if (info.preset !== 'react-native-init' && info.preset !== 'expo') {
      print.error('Can not find valid anoa configuration in package.json.')
      process.exit(0)
      return false
    }

    await utils.generate(
      'shared/src/data',
      'src/data/',
      [{ source: `index.${info.preset}.ts`, dest: 'index.ts' }],
      {
        name: info.name + '-db',
      },
    )

    // modify App.tsx
    const appTsx = utils.ast('src/App.tsx')
    appTsx.addNamedImports('./data', ['AppData'])
    appTsx.addSyntaxToMethod('App', 'prepare', 'await AppData.init()')
    appTsx.sortImports()
    appTsx.save()

    return true
  }

  async createProvider(name: string) {
    const {
      utils,
      strings: { pascalCase, kebabCase },
      print,
    } = this.context

    if (!(await this.isModelExists())) {
      print.error('None of data model found on this project.')
      print.warning('To create data provider at least you must have one data model.')
      print.info(`Run ${print.colors.yellow(`anoa data m <model-name>`)} to create new one.`)
      process.exit(0)
      return
    }

    await utils.generate(
      'shared/src/data/providers',
      'src/data/providers/',
      [{ source: 'provider.ts', dest: `${kebabCase(name)}.ts` }],
      {
        name: pascalCase(name),
      },
    )

    await this.updateProviderExports()
    return await this.initProvider()
  }

  async updateProviderExports() {
    const { utils } = this.context

    const files = await utils.fileList('src/data/providers')
    const exports = files
      .filter(f => f.name !== 'index.ts')
      .map(f => f.name.slice(0, f.name.length - 3))
      .sort()

    await utils.generate('shared/src/data/providers', 'src/data/providers/', ['index.ts'], {
      exports,
    })
  }
}

export function data(context: RootContext) {
  return new Data(context)
}

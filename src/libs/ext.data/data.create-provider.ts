import { RootContext } from '..'

export function dataAppProviderInit(context: RootContext) {
  return async () => {
    const {
      projectInfo,
      filesystem: { exists },
      dataIsModelExists,
      generateFiles,
      print,
    } = context

    if (exists('src/data/index.ts') === 'file') {
      return
    }

    if (!(await dataIsModelExists())) {
      return
    }

    const info = await projectInfo()

    if (info.preset !== 'react-native-init' && info.preset !== 'expo') {
      print.error('Can not find valid anoa configuration in package.json.')
      process.exit(0)
      return
    }

    await generateFiles(
      'shared/src/data',
      [`index.${info.preset}.ts`],
      'src/data/',
      {
        name: info.name + '-db',
      },
      'index.ts',
    )
  }
}

export function dataCreateProvider(context: RootContext) {
  return async (name: string) => {
    const {
      dataIsModelExists,
      generateFiles,
      strings: { pascalCase, kebabCase },
      dataUpdateProviderExports,
      dataAppProviderInit,
      print,
    } = context

    if (!(await dataIsModelExists())) {
      print.error('None of data model found on this project.')
      print.warning('To create data provider at least you must have one data model.')
      print.info(`Run ${print.colors.yellow(`anoa data m <model-name>`)} to create new one.`)
      process.exit(0)
      return
    }

    await generateFiles(
      'shared/src/data/providers',
      ['provider.ts'],
      'src/data/providers/',
      {
        name: pascalCase(name),
      },
      `${kebabCase(name)}.ts`,
    )

    await dataUpdateProviderExports()
    await dataAppProviderInit()
  }
}

export function dataUpdateProviderExports(context: RootContext) {
  return async () => {
    const { fileList, generateFiles } = context

    const files = await fileList('src/data/providers')
    const exports = files
      .filter(f => f.name !== 'index.ts')
      .map(f => f.name.slice(0, f.name.length - 3))
      .sort()

    await generateFiles(
      'shared/src/data/providers',
      ['index.ts'],
      'src/data/providers/',
      {
        exports,
      },
      `index.ts`,
    )
  }
}

import { RootContext } from '..'

export function dataCreateModel(context: RootContext) {
  return async (name: string) => {
    const {
      dataInit,
      generateFiles,
      strings: { pascalCase, kebabCase },
      dataUpdateModelExports,
    } = context

    await dataInit()
    await generateFiles(
      'shared/src/data/models',
      ['model.ts'],
      'src/data/models/',
      {
        name: pascalCase(name),
      },
      `${kebabCase(name)}.ts`,
    )

    await dataUpdateModelExports()
  }
}

export function dataUpdateModelExports(context: RootContext) {
  return async () => {
    const { fileList, generateFiles } = context

    const files = await fileList('src/data/models')
    const exports = files
      .filter(f => f.name !== 'index.ts')
      .map(f => f.name.slice(0, f.name.length - 3))
      .sort()

    await generateFiles(
      'shared/src/data/models',
      ['index.ts'],
      'src/data/models/',
      {
        exports,
      },
      `index.ts`,
    )
  }
}

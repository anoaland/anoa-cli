module.exports = context => {
  context.boilerplateExpo = async (projectName, withStore) => {
    const {
      system,
      print,
      filesystem,
      npmAddDevPackages,
      generateFiles,
      patching,
      strings,
      storeCreateReducer,
    } = context

    let hasExpo

    try {
      hasExpo = !!(await system.run('npm info expo'))
    } catch (error) {
      hasExpo = false
    }

    if (!hasExpo) {
      print.error(
        `The ${print.colors.yellow(
          'expo-cli',
        )} was not found. We need this to be installed to generate the boilerplate.`,
      )
      return process.exit(0)
    }

    const spinner = print.spin(`Creating ${projectName}...`)

    await system.run(`expo init ${projectName} -t blank`)

    process.chdir(projectName)

    await npmAddDevPackages([
      'typescript',
      'react-native-typescript-transformer',
      '@types/react',
      '@types/react-native',
      '@types/expo',
      '@types/expo__vector-icons',
      'tslib',
      'tslint',
      'tslint-config-prettier',
      'tslint-react',
    ])

    if (withStore) {
      await storeCreateReducer('app', ['foo', 'bar'])
    }

    await patching.update('app.json', app => {
      const { expo } = app
      expo.packagerOpts = {
        ...expo.packagerOpts,
        ...{
          sourceExts: ['ts', 'tsx'],
          transformer: 'node_modules/react-native-typescript-transformer/index.js',
        },
      }
      app.expo = expo
      return app
    })

    await filesystem.remove('App.js')
    await patching.update('package.json', pkg => {
      pkg.name = strings.kebabCase(projectName)
      return pkg
    })

    await generateFiles('shared', ['tslint.json', 'tsconfig.json', '.jshintrc', '.prettierrc'])

    if (withStore) {
      await generateFiles('expo/withStore/src/', ['App.tsx'], 'src/')
    } else {
      await generateFiles('basic', ['src/App.tsx'])
    }

    await generateFiles('expo', ['App.js'])

    spinner.succeed(`Yay! The ${print.colors.green(projectName)} project is ready!`)
  }
}

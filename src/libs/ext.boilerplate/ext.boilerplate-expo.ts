import { RootContext } from '../'

export function boilerplateExpo(context: RootContext) {
  return async (projectName: string) => {
    const { system, print, npm, patching, strings, utils, yarn } = context

    // ensure expo is installed

    let hasExpo

    try {
      hasExpo = !!(await system.run('expo --version'))
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

    // execute expo-cli to create initial boilerplate

    const spinner = print.spin(`Creating ${print.colors.yellow(projectName)} project...`)
    await system.run(`expo init ${projectName} -t blank ${yarn ? '--yarn' : '--npm'}`)

    // add necessary packages

    process.chdir(projectName)

    await npm.addPackages(
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
        'tslint-react',
      ],
      true,
    )

    // patch the app.json

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

    // patch the package.json

    await patching.update('package.json', pkg => {
      pkg.name = strings.kebabCase(projectName)
      pkg.anoa = {
        preset: 'expo',
      }
      return pkg
    })

    // add asset files

    utils.copyAssetFile('logo.png', 'assets/logo.png')
    utils.copyAssetFile('icon.png', 'assets/icon.png')
    utils.copyAssetFile('splash.png', 'assets/splash.png')

    // generate boilerplate files

    await utils.generate('shared', '', ['tslint.json', 'tsconfig.json', '.jshintrc', '.prettierrc'])
    await utils.generate('boilerplate/expo', '', [
      {
        source: 'App.tsx',
        dest: 'src/App.tsx',
      },
      'App.js',
    ])
    await utils.generate('boilerplate/shared/main-screen', 'src/views/screens/main', [
      'index.tsx',
      'props.ts',
    ])

    // send greetings

    spinner.succeed(`Yay! The ${print.colors.green(projectName)} project is ready!`)
    print.fancy(
      `Do ${print.colors.yellow(
        `cd ${projectName} && ${context.yarn ? 'yarn' : 'npm'} start`,
      )} to run the app.`,
    )
  }
}

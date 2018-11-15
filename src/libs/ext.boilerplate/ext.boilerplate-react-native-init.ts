import { RootContext } from '../'

export function boilerplateReactNativeInit(context: RootContext) {
  return async (projectName: string) => {
    const { system, print, filesystem, npm, patching, strings, utils } = context

    // ensure react-native-cli is installed

    let hasReactNative

    try {
      hasReactNative = !!(await system.run('npm info react-native'))
    } catch (error) {
      hasReactNative = false
    }

    if (!hasReactNative) {
      print.error(
        `The ${print.colors.yellow(
          'react-native-cli',
        )} was not found. We need this to be installed to generate the boilerplate.`,
      )
      return process.exit(0)
    }

    // execute react-native-cli to create initial boilerplate

    const spinner = print.spin(`Creating ${print.colors.yellow(projectName)} project...`)
    await system.run(`react-native init ${projectName}`)

    // add necessary packages

    process.chdir(projectName)

    await npm.addPackages(
      [
        'typescript',
        'react-native-typescript-transformer',
        '@types/react',
        '@types/react-native',
        'tslint',
        'tslint-config-prettier',
        'tslint-react',
      ],
      true,
    )

    // we don't use App.js

    await filesystem.remove('App.js')

    // patch the package.json

    await patching.update('package.json', pkg => {
      pkg.name = strings.kebabCase(projectName)
      pkg.anoa = {
        preset: 'react-native-init',
      }
      return pkg
    })

    // add asset files

    utils.copyAssetFile('logo.png', 'assets/logo.png')

    // generate boilerplate files

    await utils.generate('shared', '', ['tslint.json', 'tsconfig.json', '.jshintrc', '.prettierrc'])
    await utils.generate('boilerplate/rni', '', [
      {
        source: 'App.tsx',
        dest: 'src/App.tsx',
      },
      'index.js',
      'rn-cli.config.js',
    ])
    await utils.generate('boilerplate/shared/main-screen', 'src/views/screens/main', [
      'index.tsx',
      'props.tsx',
    ])

    spinner.succeed(`Yay! The ${print.colors.green(projectName)} project is ready!`)
    print.fancy(
      `Do ${print.colors.yellow(
        `cd ${projectName} && ${context.yarn ? 'yarn' : 'npm'} start`,
      )} to run the app.`,
    )
  }
}

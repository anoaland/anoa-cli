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

    // go to project dir    
    process.chdir(projectName)

    // determine babel config file
    const useBabelConfigJs = filesystem.exists('babel.config.js')

    // add necessary packages

    const devPackages = [
      'typescript',
      'react-native-typescript-transformer',
      '@types/react',
      '@types/react-native',
      'tslint',
      'tslint-config-prettier',
      'tslint-react',
      '@babel/plugin-proposal-decorators@7.1.6',
    ]
    if (useBabelConfigJs) {
      devPackages.push('babel-merge')
    }
    await npm.addPackages(devPackages, true)

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

    if (filesystem.exists('.babelrc')) {
      // patch .babelrc
      await patching.update('.babelrc', cfg => {
        if (typeof cfg === 'string') {
          cfg = JSON.parse(cfg)
        }

        cfg.plugins = [
          ...(cfg.plugins || []),
          ['@babel/plugin-proposal-decorators', { legacy: true }],
        ]

        return cfg
      })
    } else if (useBabelConfigJs) {
      filesystem.rename('babel.config.js', 'babel-ori.config.js')

      const contents = `const defaultConfig = require('./babel-ori.config.js')
const babelMerge = require('babel-merge')

module.exports = babelMerge(defaultConfig, {
  plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
})`

      filesystem.write('babel.config.js', contents)
    }

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
      'props.ts',
    ])

    spinner.succeed(`Yay! The ${print.colors.green(projectName)} project is ready!`)
    print.fancy(
      `Do ${print.colors.yellow(
        `cd ${projectName} && ${context.yarn ? 'yarn' : 'npm'} start`,
      )} to run the app.`,
    )
  }
}

const tempy = require('tempy')
const utils = require('../../utils')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

const qaList = [
  {
    q: 'Select project type you would like to use',
    a: utils.DOWN
  },
  {
    q: 'Name of project visible on the home screen',
    a: 'Cool Foo App'
  },
  {
    q: 'Slug or url friendly of your project',
    a: 'the-cool-foo'
  },
  {
    q:
      'We found yarn installed in your system. Do you want to use yarn instead of npm',
    a: 'y'
  }
]

jest.setTimeout(10 * 60 * 1000)

describe('expo boilerplate tests', () => {
  const ANOA = `${process.cwd()}\\bin\\anoa`
  const originalDir = process.cwd()
  let tempDir

  beforeAll(() => {
    tempDir = tempy.directory()
    process.chdir(tempDir)
  })

  afterAll(() => {
    process.chdir(originalDir)
    filesystem.remove(tempDir)
  })

  test('boilerplate files should be generated', done => {
    // run anoa init foo
    utils.run(ANOA, ['init', 'foo'], qaList, () => {
      // go to project directory
      process.chdir('foo')

      // ensure files generated
      expect(filesystem.exists('yarn.lock')).toBeTruthy()
      expect(filesystem.exists('.prettierrc')).toBeTruthy()
      expect(filesystem.exists('tslint.json')).toBeTruthy()
      expect(filesystem.exists('tsconfig.json')).toBeTruthy()

      // inspect .anoarc
      const anoarc = filesystem.read('.anoarc', 'json')
      expect(anoarc.type).toEqual('expo')

      // inspect app.json
      const appJson = filesystem.read('app.json', 'json').expo
      expect(appJson.name).toEqual('Cool Foo App')
      expect(appJson.slug).toEqual('the-cool-foo')
      expect(appJson.packagerOpts.sourceExts).toEqual(['ts', 'tsx'])
      expect(appJson.packagerOpts.transformer).toEqual(
        'node_modules/react-native-typescript-transformer/index.js'
      )

      // prepare ts project
      const project = new Project({
        addFilesFromTsConfig: true,
        tsConfigFilePath: filesystem.cwd() + '/tsconfig.json'
      })

      // inspect App.tsx
      const appTsx = project.getSourceFile('src/App.tsx')

      // app class shold be exported
      const appClass = appTsx.getClass('App')
      expect(appClass.isExported()).toBeTruthy()

      // render should returns JSX.Element
      expect(
        appClass
          .getMethod('render')
          .getReturnType()
          .getText()
      ).toEqual('JSX.Element')

      // render main should returns MainScreen element
      const renderMainStatements = appClass
        .getMethod('renderMain')
        .getStatements()
      expect(renderMainStatements.length).toEqual(1)
      expect(renderMainStatements[0].getText()).toEqual('return <MainScreen />')

      // inspect main screen file
      const mainTsx = project.getSourceFile('src/views/screens/main/index.tsx')

      // MainScreen class shold be exported
      const mainScreen = mainTsx.getClass('MainScreen')
      expect(mainScreen.isExported()).toBeTruthy()

      // render should returns JSX.Element
      expect(
        mainScreen
          .getMethod('render')
          .getReturnType()
          .getText()
      ).toEqual('JSX.Element')

      done()
    })
  })
})

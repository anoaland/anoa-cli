const tempy = require('tempy')
const { run, ENTER } = require('../../runner')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('react-native-init boilerplate tests', () => {
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

  test('boilerplate files should be generated', async () => {
    // run anoa init foo
    await run(
      ['init', 'foo'],
      [
        // 'Select project type you would like to use',
        ENTER
      ]
    )

    // go to project directory
    process.chdir('foo')

    // ensure files generated
    expect(filesystem.exists('yarn.lock')).toBeTruthy()
    expect(filesystem.exists('.prettierrc')).toBeTruthy()
    expect(filesystem.exists('tslint.json')).toBeTruthy()
    expect(filesystem.exists('tsconfig.json')).toBeTruthy()

    // inspect .anoarc
    const anoarc = filesystem.read('.anoarc', 'json')
    expect(anoarc.type).toEqual('react-native-init')

    // inspect metro.config.js
    const metroConfig = filesystem.read('metro.config.js', 'utf8')
    expect(metroConfig).toMatch(
      /babelTransformerPath\s*?:\s*?require.resolve\(\n?\s*?'react-native-typescript-transformer'\n?\s*?\)/g
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
    ).toEqual('JSX.Element | null')

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
  })
})

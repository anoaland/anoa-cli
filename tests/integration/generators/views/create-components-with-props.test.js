const tempy = require('tempy')
const { run, DOWN, ENTER, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('create components with props tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'empty-project'
  )

  const originalDir = process.cwd()
  let tempDir

  beforeEach(done => {
    tempDir = tempy.directory()
    fs.copySync(FIXTURE, tempDir)
    process.chdir(tempDir)
    done()
  })

  afterEach(done => {
    process.chdir(originalDir)
    fs.removeSync(tempDir)
    done()
  })

  test('should be able to create a class based component with props and state', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? class based
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER,

        // first state
        'state1',
        TAB,
        'string',
        TAB,
        `''`,
        ENTER,

        // end state
        ENTER
      ]
    )
    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/components/foo')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()
    expect(exists('state.ts')).toBeTruthy()

    const fooMainFile = project.addExistingSourceFile('index.tsx')

    // imports is correct
    const imports = fooMainFile
      .getImportDeclarations()
      .map(i => i.getText())
      .join('\r\n')
    expect(imports).toMatch(/import React from 'react'/gm)
    expect(imports).toMatch(/import { Text, View } from 'react-native'/gm)
    expect(imports).toMatch(/import { FooProps } from '.\/props'/gm)
    expect(imports).toMatch(/import { FooState } from '.\/state'/gm)

    // main class is exported
    const fooClass = fooMainFile.getClass('Foo')
    expect(fooClass.isExported()).toBeTruthy()

    // main class constructor parameter
    const fooConsructor = fooClass.getConstructors()[0]
    expect(fooConsructor.getParameters()[0].getText()).toEqual(
      'props: FooProps'
    )

    // main class constructor initializer
    const fooConsructorBody = fooConsructor.getBodyText()
    expect(fooConsructorBody).toMatch(/\t?super\(props\)[\r\n]/gm)
    expect(fooConsructorBody).toMatch(/\t?this.state = { state1: '' }/gm)

    // render is correct
    const fooRenderFn = fooClass.getMethod('render')
    expect(fooRenderFn.getText()).toMatch(
      /return[\w\s]?\([\s\r\n]*<View>[\s\r\n]*<Text>Foo<\/Text>[\s\r\n]*<\/View>[\s\r\n]*\)/gm
    )

    // props
    const fooPropsFile = project.addExistingSourceFile('props.ts')
    const fooPropsInterface = fooPropsFile.getInterface('FooProps')
    expect(
      fooPropsInterface
        .getProperty('props1')
        .getTypeNode()
        .getText()
    ).toEqual('string')
    expect(
      fooPropsInterface
        .getProperty('props2')
        .getTypeNode()
        .getText()
    ).toEqual('string')

    // state
    const fooStateFile = project.addExistingSourceFile('state.ts')
    const fooStateInterface = fooStateFile.getInterface('FooState')
    expect(
      fooStateInterface
        .getProperty('state1')
        .getTypeNode()
        .getText()
    ).toEqual('string')
  })

  test('should be able to create a function-view component with props', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? function-view component
        DOWN,
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/components/foo')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()

    const fooMainFile = project.addExistingSourceFile('index.tsx')

    // imports is correct
    const imports = fooMainFile
      .getImportDeclarations()
      .map(i => i.getText())
      .join('\r\n')
    expect(imports).toMatch(/import React from 'react'/gm)
    expect(imports).toMatch(/import { Text, View } from 'react-native'/gm)
    expect(imports).toMatch(/import { FooProps } from '.\/props'/gm)

    const fooFunction = fooMainFile.getFunction('Foo')
    expect(fooFunction.getBodyText()).toMatch(
      /return[\w\s]?\([\s\r\n]*<View>[\s\r\n]*<Text>Foo<\/Text>[\s\r\n]*<\/View>[\s\r\n]*\)/gm
    )
  })

  test('should be able to create a function-view functional component with props', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? function-view functional component
        DOWN,
        DOWN,
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/components/foo')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()

    const fooMainFile = project.addExistingSourceFile('index.tsx')

    // imports is correct
    const imports = fooMainFile
      .getImportDeclarations()
      .map(i => i.getText())
      .join('\r\n')
    expect(imports).toMatch(/import React from 'react'/gm)
    expect(imports).toMatch(/import { Text, View } from 'react-native'/gm)
    expect(imports).toMatch(/import { FooProps } from '.\/props'/gm)

    const fooVariable = fooMainFile.getVariableDeclaration('Foo')
    expect(fooVariable.getInitializer().getText()).toMatch(
      /props\s=>\s\{[\s\r\n]*return[\w\s]?\([\s\r\n]*<View>[\s\r\n]*<Text>Foo<\/Text>[\s\r\n]*<\/View>[\s\r\n]*\)[\s\r\n]*}/gm
    )
  })
})

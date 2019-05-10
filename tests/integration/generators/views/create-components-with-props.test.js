const tempy = require('tempy')
const utils = require('../../../utils')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('create components with props tests', () => {
  const ANOA = path.join(process.cwd(), 'bin', 'anoa')
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

  test('should be able to create a class based component with props and state', done => {
    utils.run(
      ANOA,
      ['v', 'c', 'foo'],
      [
        // class based
        {
          q: 'What component type do you prefer',
          a: utils.ENTER
        },
        // first props
        {
          q: 'name: <name>, type: <type>',
          a: 'props1' + utils.TAB + 'string'
        },
        // second props
        {
          q: 'name: <name>, type: <type>',
          a: 'props2' + utils.TAB + 'string'
        },
        // end props
        {
          q: 'name: <name>, type: <type>',
          a: utils.ENTER
        },
        // first state
        {
          q: 'name: <name>, type: <type>, initial value: <initial>',
          a: 'state1' + utils.TAB + 'string' + utils.TAB + `''`
        },
        // end state
        {
          q: 'name: <name>, type: <type>, initial value: <initial>',
          a: utils.ENTER
        }
      ],
      () => {
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

        done()
      }
    )
  })

  test('should be able to create a stateless component with props', done => {
    utils.run(
      ANOA,
      ['v', 'c', 'foo'],
      [
        // stateless component
        {
          q: 'What component type do you prefer',
          a: utils.DOWN
        },
        // first props
        {
          q: 'name: <name>, type: <type>',
          a: 'props1' + utils.TAB + 'string'
        },
        // second props
        {
          q: 'name: <name>, type: <type>',
          a: 'props2' + utils.TAB + 'string'
        },
        // end props
        {
          q: 'name: <name>, type: <type>',
          a: utils.ENTER
        }
      ],
      () => {
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

        done()
      }
    )
  })

  test('should be able to create a stateless functional component with props', done => {
    utils.run(
      ANOA,
      ['v', 'c', 'foo'],
      [
        // stateless functional component
        {
          q: 'What component type do you prefer',
          a: utils.DOWN + utils.DOWN
        },
        // first props
        {
          q: 'name: <name>, type: <type>',
          a: 'props1' + utils.TAB + 'string'
        },
        // second props
        {
          q: 'name: <name>, type: <type>',
          a: 'props2' + utils.TAB + 'string'
        },
        // end props
        {
          q: 'name: <name>, type: <type>',
          a: utils.ENTER
        }
      ],
      () => {
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

        done()
      }
    )
  })
})

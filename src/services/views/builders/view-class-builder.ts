import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../../libs'
import { Source, Utils } from '../../core'
import { ReactUtils } from '../../core/react-utils'
import { ViewKindEnum } from '../enums'
import { PropsHelper } from '../helpers/props-helper'
import { StateHelper } from '../helpers/state-helper'

export class ViewClassBuilder {
  context: RootContext
  kind: ViewKindEnum
  utils: Utils
  name: string
  location: string
  source: Source
  project: Project

  constructor(
    context: RootContext,
    name: string,
    kind: ViewKindEnum,
    location: string
  ) {
    this.context = context
    this.utils = new Utils(context)
    this.source = new Source(context)
    this.kind = kind
    this.location = location

    // assign view name
    const { naming } = this.context
    this.name =
      this.kind === ViewKindEnum.component
        ? naming.component(name)
        : naming.screen(name)

    this.project = new Project()
  }

  async build() {
    const targetFile = path.join(this.location, 'index.tsx')
    const {
      print,
      strings: { lowerCase }
    } = this.context

    // build props
    const propsHelper = new PropsHelper(
      this.context,
      this.project,
      this.name,
      this.location
    )
    const props = await propsHelper.init()

    // build state
    const stateHelper = new StateHelper(
      this.context,
      this.project,
      this.name,
      this.location
    )
    const state = await stateHelper.init()

    // processing
    const spinner = print.spin('Generating...')

    // build main file
    const mainFile = this.project.createSourceFile(targetFile)
    mainFile.addImportDeclarations([
      {
        moduleSpecifier: 'react',
        defaultImport: 'React'
      },
      {
        moduleSpecifier: 'react-native',
        namedImports: ['View', 'Text']
      }
    ])

    const hasProps = !!props.fields.length
    const hasState = !!state.fields.length

    let extendsStr: string = ''

    // build props as required
    if (hasProps) {
      await propsHelper.createFile()
      extendsStr = `<${props.name}`
      mainFile.addImportDeclaration({
        moduleSpecifier: './props',
        namedImports: [props]
      })
    }

    // build state as required
    if (hasState) {
      await stateHelper.createFile()
      if (!extendsStr) {
        extendsStr = '<any'
      }

      extendsStr += `, ${state.name}>`
      mainFile.addImportDeclaration({
        moduleSpecifier: './state',
        namedImports: [state]
      })
    } else if (extendsStr) {
      extendsStr += '>'
    }

    // main class
    const mainClass = mainFile.addClass({
      name: this.name,
      extends: `React.Component${extendsStr}`,
      isExported: true
    })

    if (hasProps || hasState) {
      mainClass.addConstructor({
        parameters: [
          {
            name: 'props',
            type: hasProps ? props.name : 'any'
          }
        ],
        bodyText: `super(props); ${
          hasState ? ReactUtils.buildStateInitializerBodyText(state.fields) : ''
        }`
      })
    }

    mainClass.addMethod({
      name: 'render',
      bodyText: `return <View><Text>${this.name}</Text></View>`
    })

    await this.source.prettifySoureFile(mainFile)
    await this.project.save()

    spinner.succeed(
      `New ${print.colors.bold(this.name)} ${lowerCase(
        this.kind
      )} successfully created on ${print.colors.bold(targetFile)}`
    )
  }
}

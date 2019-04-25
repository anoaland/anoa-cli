import * as path from 'path'
import Project from 'ts-morph'
import { RootContext } from '../../libs'
import { Source, Utils } from '../core'
import { ViewKindEnum } from './enums'
import { PropsBuilder } from './props-builder'

export class ViewStatelessBuilder {
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
    const propsBuilder = new PropsBuilder(
      this.context,
      this.project,
      this.name,
      this.location
    )

    const props = await propsBuilder.init()

    // processing
    const spinner = print.spin('Generating...')

    await propsBuilder.buildFile()

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
      },
      {
        moduleSpecifier: './props',
        namedImports: [props]
      }
    ])

    mainFile.addFunction({
      name: this.name,
      parameters: [
        {
          name: 'props',
          type: props.name
        }
      ],
      isExported: true,
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

import * as path from 'path'
import { InterfaceDeclaration, Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../libs'
import { Utils } from '../utils'
import { ReactUtils } from '../utils/react'
import { SourceUtils } from '../utils/source'
import { TsUtils } from '../utils/ts'
import { SetPropsArgs, ViewTypeEnum } from './types'

export class PropsGenerator {
  context: RootContext
  tsUtils: TsUtils
  reactUtils: ReactUtils
  utils: Utils
  sourceUtils: SourceUtils

  constructor(context: RootContext) {
    this.context = context
    this.tsUtils = new TsUtils(context)
    this.reactUtils = new ReactUtils(context)
    this.utils = new Utils(context)
    this.sourceUtils = new SourceUtils(context)
  }

  async generate(args: SetPropsArgs) {
    const {
      naming,
      print: { spin, colors }
    } = this.context

    const spinner = spin('Generating...')

    const project = new Project()
    const { view, fields, existingProps } = args
    const viewFilePath = view.sourceFile.getFilePath()
    const viewFile = project.addExistingSourceFile(viewFilePath)

    let propsFile: SourceFile
    let propsInterface: InterfaceDeclaration
    if (existingProps) {
      propsFile = project.addExistingSourceFile(
        existingProps.sourceFile.getFilePath()
      )
      propsInterface = propsFile.getInterface(existingProps.name)
    } else {
      propsFile = project.createSourceFile(
        path.join(path.dirname(viewFilePath), 'props.ts')
      )
      propsInterface = propsFile.addInterface({
        isExported: true,
        name: naming.props(view.name)
      })
    }

    this.tsUtils.setInterfaceProperties(propsInterface, fields)

    switch (view.type) {
      case ViewTypeEnum.classComponent:
        this.reactUtils.addPropsReferenceToClassView(
          viewFile.getClass(view.name),
          propsInterface
        )
        break

      case ViewTypeEnum.functionComponent:
        this.reactUtils.addPropsReferenceToFunctionView(
          viewFile.getFunction(view.name),
          propsInterface
        )
        break

      case ViewTypeEnum.arrowFunctionComponent:
        this.reactUtils.addPropsReferenceToArrowFunctionView(
          viewFile.getVariableStatement(view.name),
          propsInterface
        )
        break
    }

    await this.sourceUtils.prettifyProjectFiles(project)
    await project.save()

    spinner.succeed(
      `Changes has been made on ${colors.bold(
        this.utils.relativePath(viewFilePath)
      )} and ${colors.bold(this.utils.relativePath(propsFile.getFilePath()))}`
    )
  }
}

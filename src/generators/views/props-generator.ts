import * as path from 'path'
import { InterfaceDeclaration, Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../core/types'
import { SetPropsArgs, ViewTypeEnum } from '../../core/types'

export class PropsGenerator {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: SetPropsArgs) {
    const {
      naming,
      print: { spin, colors },
      tools
    } = this.context

    const spinner = spin('Generating...')

    const react = tools.react()
    const ts = tools.ts()
    const utils = tools.utils()
    const source = tools.source()

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

    ts.setInterfaceProperties(propsInterface, fields)

    switch (view.type) {
      case ViewTypeEnum.classComponent:
        react.addPropsReferenceToClassView(
          viewFile.getClass(view.name),
          propsInterface
        )
        break

      case ViewTypeEnum.functionComponent:
        react.addPropsReferenceToFunctionView(
          viewFile.getFunction(view.name),
          propsInterface
        )
        break

      case ViewTypeEnum.arrowFunctionComponent:
        react.addPropsReferenceToArrowFunctionView(
          viewFile.getVariableStatement(view.name),
          propsInterface
        )
        break
    }

    await source.prettifyProjectFiles(project)
    await project.save()

    spinner.succeed(
      `Changes has been made on ${colors.bold(
        utils.relativePath(viewFilePath)
      )} and ${colors.bold(utils.relativePath(propsFile.getFilePath()))}`
    )
  }
}

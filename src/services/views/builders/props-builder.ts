import * as path from 'path'
import { InterfaceDeclaration, Project } from 'ts-morph'
import { RootContext } from '../../../libs'
import { FieldObject, ObjectBuilder, Source, Utils } from '../../core'
import { ProjectBrowser } from '../../core/project-browser'
import { ReactUtils } from '../../core/react-utils'
import { ViewKindEnum, ViewTypeEnum } from '../enums'
import { PropsFile, PropsHelper } from '../helpers/props-helper'

export class PropsBuilder {
  context: RootContext
  utils: Utils
  kind: ViewKindEnum
  name: string
  projectBrowser: ProjectBrowser
  objectBuilder: ObjectBuilder
  source: Source

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.source = new Source(context)
    this.projectBrowser = new ProjectBrowser(context)
    this.objectBuilder = new ObjectBuilder(context)
  }

  async build() {
    await this.selectView()
  }

  /**
   * Select target view
   */
  async selectView() {
    const {
      strings: { lowerCase },
      filesystem: { exists, cwd },
      print
    } = this.context

    const selectedView = await this.projectBrowser.browseViews()
    this.kind = selectedView.kind

    const project = new Project()
    const viewFile = project.addExistingSourceFile(selectedView.path)

    const viewInfo = selectedView.info

    // resolving existing props
    const viewDir = path.dirname(selectedView.path)
    const propsPath = path.join(viewDir, 'props.ts')
    let propsInterface: InterfaceDeclaration
    let propsInfo: PropsFile

    if (exists(propsPath)) {
      const existingPropsFile = project.addExistingSourceFile(propsPath)
      if (viewInfo.props) {
        propsInterface = existingPropsFile.getInterface(viewInfo.props)
      } else {
        propsInterface = await this.projectBrowser.browseInterfaces(
          existingPropsFile,
          `The ${print.colors.bold(
            'props.ts'
          )} file is exists but this ${lowerCase(
            this.kind
          )} is not connected to any props.`
        )
      }

      if (propsInterface) {
        propsInfo = {
          name: propsInterface.getName(),
          fields: ReactUtils.getInterfaceFields(propsInterface)
        }
      }
    }

    let freshProps = false
    if (!propsInfo) {
      // could not resolve existing props, ask user to create
      freshProps = true
      const propsHelper = new PropsHelper(
        this.context,
        project,
        viewInfo.name,
        viewDir
      )
      propsInfo = await propsHelper.init('Add new props')
      propsInterface = await propsHelper.createInterface()
    } else {
      print.fancy(print.colors.yellow('• Modify existing props:'))
    }

    let fields = propsInfo.fields

    if (!freshProps) {
      if (fields.length) {
        fields = await this.askToRemoveFields(fields)
      }
      fields = [...fields, ...(await this.askToAddFields())]
    }

    // processing
    const spinner = print.spin('Generating...')
    ReactUtils.replaceStateProperties(propsInterface, fields)

    const propsFile = propsInterface.getSourceFile()

    switch (selectedView.info.type) {
      case ViewTypeEnum.classBased:
        ReactUtils.addPropsReferenceToClassView(
          viewFile.getClass(viewInfo.name),
          propsInterface
        )
        break

      case ViewTypeEnum.stateless:
        ReactUtils.addPropsReferenceToStatelessView(
          viewFile.getFunction(viewInfo.name),
          propsInterface
        )
        break

      case ViewTypeEnum.statelessFunctional:
        ReactUtils.addPropsReferenceToStatelessFunctionalView(
          viewFile.getVariableStatement(viewInfo.name),
          propsInterface
        )
        break
    }

    await this.source.prettifySoureFile(propsFile)
    await this.source.prettifySoureFile(viewFile)
    await project.save()

    spinner.succeed(
      `Changes has been made on ${print.colors.bold(
        path.relative(cwd(), selectedView.path)
      )} and ${print.colors.bold(
        path.relative(cwd(), propsFile.getFilePath())
      )}`
    )
  }

  async askToAddFields(): Promise<FieldObject[]> {
    const { print } = this.context
    print.fancy(`${print.colors.green('√')} Add new fields: (optional)`)
    return this.objectBuilder.queryUserInput()
  }

  async askToRemoveFields(fields: FieldObject[]): Promise<FieldObject[]> {
    return this.objectBuilder.queryFieldsToRemove(fields)
  }
}

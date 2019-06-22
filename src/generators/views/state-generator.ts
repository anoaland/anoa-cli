import * as path from 'path'
import { InterfaceDeclaration, Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../tools/context'
import { Utils } from '../utils'
import { ReactUtils } from '../utils/react'
import { SourceUtils } from '../utils/source'
import { TsUtils } from '../utils/ts'
import { SetStateArgs, ViewTypeEnum } from './types'

export class StateGenerator {
  context: RootContext
  tsUtils: TsUtils
  reactUtils: ReactUtils
  sourceUtils: SourceUtils
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.tsUtils = new TsUtils(context)
    this.reactUtils = new ReactUtils(context)
    this.sourceUtils = new SourceUtils(context)
    this.utils = new Utils(context)
  }

  async generate(args: SetStateArgs) {
    const { view } = args
    const isHooks = view.type !== ViewTypeEnum.classComponent
    if (!isHooks) {
      await this.generateState(args)
    } else {
      await this.generateHooks(args)
    }
  }

  /**
   * Update existing state or create a new one
   * @param args args
   */
  private async generateState(args: SetStateArgs) {
    const {
      naming,
      print: { spin, colors }
    } = this.context

    const spinner = spin('Generating...')

    const project = new Project()
    const { view, fields, existingState } = args
    const viewFilePath = view.sourceFile.getFilePath()
    view.addToProject(project)

    let stateFile: SourceFile
    let stateInterface: InterfaceDeclaration
    if (existingState) {
      stateFile = project.addExistingSourceFile(
        existingState.sourceFile.getFilePath()
      )
      stateInterface = stateFile.getInterface(existingState.name)
    } else {
      stateFile = project.createSourceFile(
        path.join(path.dirname(viewFilePath), 'state.ts')
      )
      stateInterface = stateFile.addInterface({
        isExported: true,
        name: naming.state(view.name)
      })
    }

    // set state fields
    this.tsUtils.setInterfaceProperties(stateInterface, fields)

    // ensure state imported
    this.reactUtils.addStateReferenceToClassView(
      view.getClass(),
      stateInterface,
      fields
    )

    await this.sourceUtils.prettifyProjectFiles(project)
    await project.save()

    spinner.succeed(
      `Changes has been made on ${colors.bold(
        this.utils.relativePath(viewFilePath)
      )} and ${colors.bold(this.utils.relativePath(stateFile.getFilePath()))}`
    )
  }

  /**
   * Update existing hooks or create new one
   * @param args args
   */
  private async generateHooks(args: SetStateArgs) {
    const {
      print: { spin, colors }
    } = this.context

    const spinner = spin('Generating...')

    const project = new Project()

    const { view, fields } = args
    view.addToProject(project)
    const viewFilePath = view.sourceFile.getFilePath()

    const fn =
      view.type === ViewTypeEnum.arrowFunctionComponent
        ? view.getArrowFunction()
        : view.getFunction()

    this.reactUtils.setHooks(fn, fields)

    await this.sourceUtils.prettifyProjectFiles(project)
    await project.save()

    spinner.succeed(
      `Changes has been made on ${colors.bold(
        this.utils.relativePath(viewFilePath)
      )}`
    )
  }
}

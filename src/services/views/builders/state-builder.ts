import * as path from 'path'
import Project, { InterfaceDeclaration, SourceFile } from 'ts-morph'
import { RootContext } from '../../../libs'
import { FieldObject, ObjectBuilder, Source, Utils } from '../../core'
import { ProjectBrowser } from '../../core/project-browser'
import { ReactUtils } from '../../core/react-utils'
import { ViewKindEnum } from '../enums'
import { StateFile, StateHelper } from '../helpers/state-helper'

export class StateBuilder {
  context: RootContext
  utils: Utils
  project: Project
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
    await this.queryUserInput()
  }

  async queryUserInput() {
    const {
      print,
      filesystem: { exists, cwd }
    } = this.context

    this.project = new Project()

    const selectedView = await this.selectView()
    const viewFile = this.project.addExistingSourceFile(selectedView.path)
    const className = selectedView.info.name
    const viewClass = viewFile.getClass(className)

    // resolving existing state
    const viewDir = path.dirname(selectedView.path)
    const statePath = path.join(viewDir, 'state.ts')

    let stateInfo: StateFile
    let stateInterface: InterfaceDeclaration

    if (exists(statePath)) {
      const existingStateFile = this.project.addExistingSourceFile(statePath)

      if (selectedView.info.state) {
        // found interface reference, the stateFile must be the correct state
        stateInterface = existingStateFile.getInterface(selectedView.info.state)
      } else {
        // no reference, ask user to choose
        stateInterface = await this.pickStateInterface(existingStateFile)
      }

      if (stateInterface) {
        // breakdown the state interface
        stateInfo = {
          name: stateInterface.getName(),
          fields: ReactUtils.getInterfaceFields(stateInterface)
        }
      }
    }

    let freshState = false
    if (!stateInfo) {
      // could not resolve existing state, ask user to create
      freshState = true
      const stateHelper = new StateHelper(
        this.context,
        this.project,
        className,
        viewDir
      )
      stateInfo = await stateHelper.init('Add new state')
      stateInterface = await stateHelper.createInterface()
    } else {
      print.fancy(print.colors.yellow('• Modify existing state:'))
    }

    let viewConstructor = ReactUtils.getConstructorFromClass(viewClass)
    if (!viewConstructor) {
      viewConstructor = viewClass.insertConstructor(0, {
        parameters: [{ name: 'props', type: 'any' }],
        bodyText: 'super(props);'
      })
    }

    // merge state fields with initial values
    const stateInitializer = ReactUtils.getStateInitializer(viewConstructor)
    let fields: FieldObject[] = []
    for (const f of stateInfo.fields) {
      fields.push({
        ...f,
        initial: freshState && f.initial ? f.initial : stateInitializer[f.name]
      })
    }

    // is existing state found?
    if (!freshState) {
      fields = await this.askToRemoveStateFields(fields)
      fields = [...fields, ...(await this.askToAddStateFields())]
    }

    // processing
    const spinner = print.spin('Generating...')

    // replace state properties
    ReactUtils.replaceStateProperties(stateInterface, fields)

    // replace state initializer
    ReactUtils.replaceStateInitializer(viewConstructor, fields)

    // add state reference
    if (!selectedView.info.state) {
      ReactUtils.addStateReference(viewClass, stateInfo.name)
    }

    const stateFile = stateInterface.getSourceFile()
    await this.source.prettifySoureFile(stateFile)
    await this.source.prettifySoureFile(viewFile)
    await this.project.save()

    spinner.succeed(
      `Changes has been made on ${print.colors.bold(
        path.relative(cwd(), selectedView.path)
      )} and ${print.colors.bold(
        path.relative(cwd(), stateFile.getFilePath())
      )}`
    )
  }

  /**
   * Select target view
   */
  async selectView() {
    const {
      prompt,
      folder,
      strings: { lowerCase },
      print
    } = this.context

    // ask user for screen or component
    const { kind } = await prompt.ask([
      {
        name: 'kind',
        message: `Which view you would like to add:`,
        type: 'list',
        choices: [ViewKindEnum.component, ViewKindEnum.screen],
        initial: ViewKindEnum.component
      }
    ])
    this.kind = kind as any

    // now select the view
    const rootDir =
      kind === ViewKindEnum.component ? folder.components() : folder.screens()

    const selectedView = await this.projectBrowser.browseReactClasses(
      `Select ${lowerCase(kind)}`,
      rootDir
    )
    if (!selectedView) {
      this.utils.exit(
        `Aborted - could not found ${print.colors.magenta('index.tsx')} file`
      )
    }

    return selectedView
  }

  async askToAddStateFields(): Promise<FieldObject[]> {
    const { print } = this.context
    print.fancy(`${print.colors.green('√')} Add new fields: (optional)`)
    return this.objectBuilder.queryUserInput(true)
  }

  async askToRemoveStateFields(fields: FieldObject[]): Promise<FieldObject[]> {
    const { prompt, print } = this.context

    const choices = fields.map(f => ({
      key: `${f.name}:${f.type}`,
      value: f
    }))

    const { keys } = await prompt.ask([
      {
        name: 'keys',
        message: `Select state field(s) you would like to ${print.colors.red(
          'remove'
        )} (optional)`,
        type: 'multiselect',
        choices: choices.map(c => c.key)
      }
    ])

    return choices.filter(c => keys.indexOf(c.key) < 0).map(c => c.value)
  }

  async pickStateInterface(stateFile: SourceFile) {
    const {
      strings: { lowerCase },
      prompt,
      print
    } = this.context

    const msg = `• The ${print.colors.bold(
      'state.ts'
    )} file is exists but this ${lowerCase(
      this.kind
    )} is not connected to any state.`

    print.info(print.colors.yellow(msg))

    const createNew = print.colors.magenta('... or create a new one.')
    const useThis = 'Use and modify this interface.'

    const interfaces = stateFile.getInterfaces().filter(i => i.isExported())
    if (interfaces.length === 1) {
      const choices = [useThis, createNew]
      const { choosen } = await prompt.ask([
        {
          name: 'choosen',
          message: `Found ${print.colors.yellow(
            interfaces[0].getName()
          )} interface.`,
          type: 'list',
          choices,
          initial: useThis
        }
      ])

      if (choosen === useThis) {
        return interfaces[0]
      }
      this.utils.exit('Aborted')
    } else if (interfaces.length > 1) {
      const choices = [...interfaces.map(i => i.getName()), createNew]
      const { name } = await prompt.ask([
        {
          name: 'name',
          message: `Select one interface you would like to use and modify:`,
          type: 'list',
          choices,
          validate(val) {
            if (!val) {
              return 'Please select one interface to modify'
            }
            return true
          }
        }
      ])
      return interfaces.find(i => i.getName() === name)
    } else {
      return undefined
    }
  }
}

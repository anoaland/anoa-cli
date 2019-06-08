import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Utils } from '../../../core'
import { NamePathInfo, ProjectBrowser } from '../../../core/project-browser'
import { ActionTypeInfo, ReduxUtils } from '../../../core/redux-utils'

export class ReduxThunkQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  project: Project
  utils: Utils
  actionType?: ActionTypeInfo
  filePath: string
  name: string

  constructor(context: RootContext, project: Project) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.project = project
    this.utils = new Utils(context)
  }

  async run() {
    const {
      filesystem: { exists, list, cwd },
      // print: { colors, fancy },
      prompt,
      folder,
      naming
    } = this.context

    const { thunkName } = await prompt.ask({
      type: 'input',
      name: 'thunkName',
      message: 'Name of thunk',
      validate(val) {
        if (!val) {
          return 'Thunk name is required'
        }
        return true
      }
    })

    const baseDir = folder.thunks()
    let isNewFile = true

    if (exists(baseDir)) {
      isNewFile = await this.utils.confirm(
        'Do you want to create a new file for this thunk?'
      )
    }

    let filePath: string
    if (!isNewFile) {
      const thunkFiles = list(baseDir)
      const { selectedThunkFile } = await prompt.ask({
        type: 'select',
        name: 'selectedThunkFile',
        message: 'Select a file:',
        choices: thunkFiles
      })
      filePath = selectedThunkFile
    } else {
      const { newThunkFile } = await prompt.ask({
        type: 'input',
        name: 'newThunkFile',
        message: 'File name',
        validate(val) {
          if (!val) {
            return 'File name is required'
          }
          return true
        }
      })
      filePath = newThunkFile
    }

    const isFromReducer = await this.utils.confirm(
      'Do you want to generate thunk from reducer?'
    )

    if (isFromReducer) {
      await this.selectReducer()
    }

    if (!filePath.endsWith('.ts')) {
      filePath += '.ts'
    }

    this.filePath = path.join(cwd(), folder.thunks(filePath))
    this.name = naming.thunk(thunkName)
  }

  private async selectReducer() {
    const { prompt } = this.context
    let actionTypes
    let choices

    await this.projectBrowser.browseReducers(async (reducer, reducers) => {
      actionTypes = await this.getActionTypeChoices(reducer)
      choices = Object.keys(actionTypes)
      if (!choices || !choices.length) {
        const msg = 'This reducer does not have any action type.'
        if (Object.keys(reducers).length === 1) {
          this.utils.exit(msg)
          return
        }

        return msg
      }

      return true
    })

    const { actionTypeKey } = await prompt.ask({
      name: 'actionTypeKey',
      type: 'select',
      message: 'Select an action type',
      choices
    })

    this.actionType = actionTypes[actionTypeKey]
  }

  private async getActionTypeChoices(reducer: NamePathInfo) {
    const { actionTypeChoices } = ReduxUtils.resolveActionTypes(
      this.context,
      this.project,
      reducer
    )

    return actionTypeChoices()
  }
}
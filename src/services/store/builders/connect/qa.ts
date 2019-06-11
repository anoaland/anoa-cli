import { Project } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { FieldObject, Utils } from '../../../core'
import {
  BrowseViewInfo,
  NamePathInfo,
  ProjectBrowser
} from '../../../core/project-browser'
import { ThunkInfo } from '../../../core/redux-utils'

export class ReduxConnectQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  project: Project
  utils: Utils
  result: {
    states: Array<FieldObject<NamePathInfo>>
    thunks: ThunkInfo[]
    views: BrowseViewInfo[]
  }

  constructor(context: RootContext, project: Project) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.project = project
    this.utils = new Utils(context)
  }

  async run() {
    const { print } = this.context
    const states = await this.projectBrowser.browseReducerStates()
    const thunks = await this.projectBrowser.browseReduxThunks()
    if (!states.length && !thunks.length) {
      print.fancy(
        print.colors.magenta(
          '\r\n  Cancelled - No state neither thunks were selected.'
        )
      )
      process.exit(0)
      return
    }

    const kind = await this.projectBrowser.selectViewKind(
      'Select view kind to connect'
    )
    const views = (await this.projectBrowser.browseAllViews(
      true,
      undefined,
      kind
    )) as BrowseViewInfo[]

    this.result = {
      states,
      thunks,
      views
    }
  }
}

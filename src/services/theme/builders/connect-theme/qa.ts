import { ViewKindEnum } from '../../../../generators/views/types'
import { RootContext } from '../../../../tools/context'
import { Utils } from '../../../core'
import { BrowseViewInfo, ProjectBrowser } from '../../../core/project-browser'

export class ConnectThemeBuilderQA {
  context: RootContext
  utils: Utils
  result: ConnectThemeBuilderQAResult
  projectBrowser: ProjectBrowser

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.projectBrowser = new ProjectBrowser(context)
  }

  async run() {
    const viewKind = await this.projectBrowser.selectViewKind()
    const views = (await this.projectBrowser.browseAllViews(
      true,
      `Select ${viewKind.toLowerCase()}(s) to connect`,
      viewKind
    )) as BrowseViewInfo[]

    this.result = {
      views,
      viewKind
    }
  }
}

export interface ConnectThemeBuilderQAResult {
  views: BrowseViewInfo[]
  viewKind: ViewKindEnum
}

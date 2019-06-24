import { ReactView } from '../../../core/libs/react-view';
import { ConnectThemeArgs, RootContext } from '../../../core/types';

export class ConnectThemeServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<ConnectThemeArgs> {
    const { tools } = this.context
    const cli = tools.cli()
    const viewKind = await cli.selectViewKind()
    const views = (await cli.browseViews(
      viewKind,
      true,
      `Select ${viewKind.toLowerCase()}(s) to connect`
    )) as ReactView[]

    return {
      views,
      viewKind
    }
  }
}

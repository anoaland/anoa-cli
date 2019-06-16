import * as path from 'path'
import { RootContext } from '../../libs'

export class ProjectUtils {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Copy asset file from assets folder into destination.
   */
  copyAssetFile(pathOrName) {
    const {
      filesystem: { cwd, copy, exists, remove },
      folder
    } = this.context

    const dest = cwd(folder.assets(pathOrName)).cwd()
    if (exists(dest)) {
      remove(dest)
    }

    copy(path.resolve(__dirname, '../../assets/', pathOrName), dest)
  }

  /**
   * Copy multiple assets from assets folder into destination.
   * @param assets asset list
   */
  copyAssetFiles(assets: string[]) {
    const { print } = this.context
    const spinner = print.spin('Adding assets...')
    for (const asset of assets) {
      this.copyAssetFile(asset)
    }
    spinner.succeed('Asset files were successfully added.')
  }
}

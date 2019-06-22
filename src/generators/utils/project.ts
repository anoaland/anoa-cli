import { InspectTreeResult } from 'fs-jetpack/types'
import * as path from 'path'
import { Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../tools/context'
import { ViewKindEnum } from '../views/types'
import { ReactComponentInfo, ReactUtils } from './react'
import { ReactView } from './react-view'

export class ProjectUtils {
  context: RootContext
  cachedViews: { [key: string]: ReactView[] } = {}
  reactUtils: ReactUtils

  constructor(context: RootContext) {
    this.context = context
    this.reactUtils = new ReactUtils(context)
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

  /**
   * Full directory list
   * @param dir root directory
   */
  dirListDeep(dir: string): string[] {
    const res: DirectoryInfo[] = []
    let id = 0

    let parent = '/'
    let level = 0

    function iterate(parentId: number, trees: InspectTreeResult[]) {
      trees.forEach(t => {
        const pId = id++

        let prnId = parentId
        if (parentId > -1) {
          let found = false
          while (!found) {
            const prn = res.find(p => p.id === prnId)
            if (!prn) {
              found = true
            } else {
              level++
              prnId = prn.parentId
              parent = '/' + prn.name + parent
            }
          }
        }

        res.push({ id: pId, name: t.name, parent, parentId, level })
        parent = '/'
        level = 0

        if (t.children && t.children.length) {
          iterate(pId, t.children.filter(c => c.type === 'dir'))
        }
      })
    }

    const tree = this.dirList(dir)
    iterate(-1, tree)

    return res.map(p => p.parent + p.name)
  }

  /**
   * list of directories at first level only
   * @param dir root directory
   */
  dirList(dir: string) {
    const {
      filesystem: { inspectTree }
    } = this.context

    const tree = inspectTree(dir)
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'dir')
  }

  /**
   * Get list of view source files
   * @param kind view kind (screen or component)
   * @param dir base directory relative to views folder
   */
  viewList(kind: ViewKindEnum, dir: string = '/'): ReactView[] {
    const { folder } = this.context

    const vkey = kind + dir
    if (this.cachedViews[vkey]) {
      return this.cachedViews[vkey]
    }

    const baseDir =
      kind === ViewKindEnum.component ? folder.components() : folder.screens()

    this.cachedViews[vkey] = this.getReactFiles(baseDir, dir)
      .map(f => {
        return {
          sourceFile: f,
          info: this.reactUtils.getReactViewInfo(f),
          kind
        }
      })
      .filter(f => !!f.info)
      .map(f => new ReactView(this.context, f.sourceFile, f.kind, f.info))

    return this.cachedViews[vkey]
  }

  private getReactFiles(baseDir, dir = '/'): SourceFile[] {
    const project = new Project()
    return project.addExistingSourceFiles(path.join(baseDir, dir, '**/*.tsx'))
  }
}

export interface DirectoryInfo {
  id: number
  parentId: number
  name: string
  parent: string
  level: number
}

export interface ViewInfo {
  key: string
  sourceFile: SourceFile
  info: ReactComponentInfo
  kind: ViewKindEnum
}

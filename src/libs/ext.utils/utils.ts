import { RootContext } from '..'
import { Project } from 'ts-simple-ast'
import { Ast } from './ast'
import * as path from 'path'
import { format } from 'prettier'
import { AnoaProjectInfo } from '../types'
import { GluegunFileSystemInspectTreeResult } from 'gluegun-fix'
import { sortWith, ascend, prop } from 'ramda'

export interface GenerateFileInfo {
  source: string
  dest?: string
}

export class Utils {
  context: RootContext
  project: Project

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Reload ast project
   */
  refreshAst() {
    const {
      filesystem: { cwd, exists },
    } = this.context

    if (!exists('tsconfig.json')) {
      return
    }

    const tsfonfig = cwd('tsconfig.json').cwd()
    this.project = new Project({
      tsConfigFilePath: `${tsfonfig}`,
    })
  }

  /**
   * Manipulate file trough AST.
   * @param filepath source file path
   */
  ast(filepath: string) {
    if (!this.project) {
      this.refreshAst()
    }
    return new Ast(this.context, this.project, filepath)
  }

  /**
   * Get prettier config.
   */
  getPrettierConfig() {
    const {
      filesystem: { cwd, read },
    } = this.context

    const cfg = read(cwd('.prettierrc').cwd())
    if (!cfg) {
      return {
        semi: false,
        singleQuote: true,
      }
    }

    return JSON.parse(cfg)
  }

  /**
   * Format source code.
   * @param filepath file to save
   * @param source source file contents
   */
  prettify(filepath: string, source?: string) {
    const {
      filesystem: { write, read },
    } = this.context

    if (!source) {
      source = read(filepath)
    }

    write(
      filepath,
      format(source, {
        parser: 'typescript',
        ...this.getPrettierConfig(),
      }),
    )
  }

  /**
   * Generate files bases on template.
   * @param tplDir Template directory
   * @param destDir Destination directory
   * @param files Files to be generated
   * @param props Template props
   */
  async generate(
    tplDir: string,
    destDir: string,
    files: (GenerateFileInfo | string)[],
    props?: any,
  ) {
    const {
      template: { generate },
      filesystem: { write },
    } = this.context

    for (const file of files) {
      const target =
        typeof file === 'string'
          ? path.join(destDir, file)
          : path.join(destDir, file.dest ? file.dest : file.source)

      const sourceCode = await generate({
        template: path.join(tplDir, `${typeof file === 'string' ? file : file.source}.ejs`),
        props,
      })

      if (target.endsWith('ts') || target.endsWith('tsx')) {
        this.prettify(target, sourceCode)
      } else {
        write(target, sourceCode)
      }
    }
  }

  /**
   * Get current project information.
   */
  async projectInfo() {
    const pkg = await this.context.npm.packageJson()
    return { name: pkg.name, ...pkg.anoa } as AnoaProjectInfo
  }

  /**
   * Get relative path from target to source.
   * @param source source path
   * @param target target path
   */
  relative(source: string, target: string) {
    const {
      filesystem: { cwd },
    } = this.context
    let result = path.relative(
      cwd(path.join('src', target)).cwd(),
      cwd(path.join('src', source)).cwd(),
    )
    const info = path.parse(result)
    if (info.dir.indexOf(`..`) < 0) {
      result = `.` + path.sep + result
    }
    return result.replace(/\\/g, '/')
  }

  /**
   * Get list file of directory.
   * @param dir Directory
   */
  async fileList(dir: string) {
    const {
      filesystem: { inspectTree },
    } = this.context

    const tree = ((await inspectTree(dir)) as any) as GluegunFileSystemInspectTreeResult
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'file')
  }

  async dirList(dir: string) {
    const {
      filesystem: { inspectTree },
    } = this.context

    const tree = ((await inspectTree(dir)) as any) as GluegunFileSystemInspectTreeResult
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'dir')
  }

  async dirNames(dir: string) {
    const dirs = (await this.dirList(dir)).map(d => '/' + d.name)
    if (dirs.length) {
      dirs.splice(0, 0, '/')
    }

    return dirs
  }

  async dirNamesDeep(dir: string) {
    const res = []
    let id = 0

    let parent = '/'
    let level = 0

    function iterate(parentId: number, trees: GluegunFileSystemInspectTreeResult[]) {
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

    const tree = await this.dirList(dir)
    iterate(-1, tree)
    return res.map(p => p.parent + p.name)
  }

  copyAssetFile(source: string, dest: string) {
    const {
      filesystem: { cwd, copy, exists, remove },
    } = this.context

    dest = cwd(dest).cwd()
    if (exists) {
      remove(dest)
    }

    copy(path.resolve(__dirname, '../../assets/', source), dest)
  }

  /**
   * Sort import statements
   * @param imports import statements
   */
  sortImport(imports: string[]) {
    const mapImports = imports.map(a => {
      var ss = a.split(' from ')
      let order = 1
      if (ss[1][1] !== '.') {
        order = 0
      }

      return {
        order,
        impor: ss[0],
        from: ss[1],
        res: a,
      }
    })

    const doSort = sortWith([ascend(prop('order')), ascend(prop('from')), ascend(prop('impor'))])
    return doSort(mapImports).map((a: any) => a.res)
  }
}

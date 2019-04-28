import * as path from 'path'
import Project, { SourceFile } from 'ts-morph'
import { RootContext } from '../../libs'
import { ReactUtils } from './react-utils'

export class ProjectBrowser {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  browse(baseDir, dir = '/') {
    const project = new Project()
    return project.addExistingSourceFiles(
      path.join(baseDir, dir, '**/*.ts?(x)')
    )
  }

  async browseReactClasses(
    message: string,
    baseDir: string,
    dir: string = '/'
  ) {
    const { prompt } = this.context

    const files = this.browse(baseDir, dir)
      .map(f => ({
        path: f.getFilePath(),
        classes: f.getClasses(),
        sourceFile: f
      }))
      .map(f => {
        const classes = f.classes.map(c => ReactUtils.getReactClassInfo(c))
        const info = classes.length ? classes[0] : undefined
        return {
          path: f.path,
          sourceFile: f.sourceFile,
          info
        }
      })
      .filter(f => !!f.info)
      .map(f => ({
        ...f,
        key: f.info.name + ` [${this.getPath(baseDir, f.sourceFile)}]`
      }))

    const { selectedReactClass } = await prompt.ask([
      {
        name: 'selectedReactClass',
        type: 'list',
        message,
        choices: files.map(f => f.key),
        validate(val) {
          if (!val) {
            return 'Please choose one class'
          }
          return true
        }
      }
    ])

    return files.find(f => f.key === selectedReactClass)
  }

  getPath(baseDir: string, sourceFile: SourceFile) {
    return path.relative(baseDir, sourceFile.getFilePath()).replace(/\\/g, '/')
  }
}

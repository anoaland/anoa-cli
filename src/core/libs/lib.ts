import { Project, SourceFile } from 'ts-morph'
import { RootContext } from '../types'

export class Lib {
  sourceFile: SourceFile
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Add this source code to other project
   * @param project other project
   */
  addToProject(project: Project) {
    this.sourceFile = project.addExistingSourceFile(
      this.sourceFile.getFilePath()
    )
    return this.sourceFile
  }

  /**
   * Remove source file from global project.
   */
  detach() {
    this.context.tools.source().project.removeSourceFile(this.sourceFile)
  }

  /**
   * Attach source file to global project.
   * Only call this function if you detached this view.
   */
  attach() {
    this.sourceFile = this.context.tools
      .source()
      .project.addExistingSourceFile(this.sourceFile.getFilePath())
  }
}

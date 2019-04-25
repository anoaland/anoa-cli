import * as path from 'path'
import { format, resolveConfig } from 'prettier'
import { SourceFile } from 'ts-morph'
import { RootContext } from '../../libs'

export class Source {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
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
    files: Array<GenerateFileInfo | string>,
    props?: any
  ) {
    const {
      template: { generate },
      filesystem: { write }
    } = this.context

    for (const file of files) {
      const target =
        typeof file === 'string'
          ? path.join(destDir, file)
          : path.join(destDir, file.dest ? file.dest : file.source)

      const sourceCode = await generate({
        template: path.join(
          tplDir,
          `${typeof file === 'string' ? file : file.source}.ejs`
        ),
        props
      })

      if (target.endsWith('ts') || target.endsWith('tsx')) {
        this.prettify(target, sourceCode)
      } else {
        write(target, sourceCode)
      }
    }
  }

  /**
   * Format source code.
   * @param filepath file to save
   * @param source source file contents
   */
  async prettify(filepath: string, source?: string) {
    const {
      filesystem: { cwd, write, read }
    } = this.context

    if (!source) {
      source = read(filepath)
    }

    const opt = await resolveConfig(cwd())

    write(
      filepath,
      format(source, {
        ...opt,
        parser: 'typescript'
      })
    )
  }

  /**
   * Format sourfile with prettier
   * @param sourceFile ts-morph source file
   */
  async prettifySoureFile(sourceFile: SourceFile) {
    const {
      filesystem: { cwd }
    } = this.context

    sourceFile.organizeImports()

    const opt = await resolveConfig(cwd())
    sourceFile.replaceWithText(
      format(sourceFile.getFullText(), {
        ...opt,
        parser: 'typescript'
      })
    )
  }
}

export interface GenerateFileInfo {
  source: string
  dest?: string
}

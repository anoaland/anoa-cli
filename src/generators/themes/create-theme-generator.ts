import * as path from 'path'
import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph'
import { CreateThemeArgs, RootContext } from '../../core/types'

export class CreateThemeGenerator {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateThemeArgs) {
    const {
      folder,
      filesystem: { cwd },
      strings: { camelCase, kebabCase },
      print: { spin, colors },
      tools
    } = this.context

    const spinner = spin('Generating...')

    const { name, filePath, base } = args
    const ts = tools.ts()
    const source = tools.source()
    const utils = tools.utils()

    const project = new Project()
    const themeFile = project.createSourceFile(filePath)
    ts.addNamedImport(themeFile, base.path, base.name)

    themeFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name,
          initializer: `${base.name}.extend(
            {
              // override default theme variables
            },
            vars => ({
              // override default theme styles
            })
          )`
        }
      ]
    })

    const stylesFile = project.addExistingSourceFile(
      path.join(cwd(), folder.styles('index.ts'))
    )

    stylesFile.addImportDeclaration({
      namedImports: [name],
      moduleSpecifier: `./themes/${kebabCase(name)}`
    })

    const themesInitializer = stylesFile
      .getVariableDeclaration('themes')
      .getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
    themesInitializer.addPropertyAssignment({
      name: camelCase(name.replace(/Theme$/g, '')),
      initializer: name
    })

    await source.prettifySoureFile(themeFile)
    await source.prettifySoureFile(stylesFile)
    await project.save()

    spinner.succeed(
      `New ${colors.cyan(
        name
      )} theme was successfully generated on ${colors.yellow(
        utils.relativePath(filePath)
      )}`
    )
  }
}

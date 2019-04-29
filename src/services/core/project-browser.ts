import * as path from 'path'
import Project, { SourceFile } from 'ts-morph'
import { RootContext } from '../../libs'
import { ViewKindEnum } from '../views/enums'
import { ReactComponentInfo, ReactUtils } from './react-utils'
import { Utils } from './utils'

export class ProjectBrowser {
  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Select target view
   */
  async selectViewKind(msg?: string): Promise<ViewKindEnum> {
    const { prompt } = this.context

    // ask user for screen or component
    const { kind } = await prompt.ask([
      {
        name: 'kind',
        message: msg || `Select a view kind:`,
        type: 'list',
        choices: [ViewKindEnum.component, ViewKindEnum.screen],
        initial: ViewKindEnum.component
      }
    ])
    return kind as any
  }

  browseReactFiles(baseDir, dir = '/'): SourceFile[] {
    const project = new Project()
    return project.addExistingSourceFiles(path.join(baseDir, dir, '**/*.tsx'))
  }

  async browseViews(message: string, baseDir: string, dir: string = '/') {
    const {
      prompt,
      print,
      strings: { padEnd }
    } = this.context
    const files = this.browseReactFiles(baseDir, dir)
      .map(f => ({
        path: f.getFilePath(),
        classes: f.getClasses(),
        functions: f.getFunctions(),
        variables: f.getVariableStatements(),
        sourceFile: f
      }))
      .map(f => {
        let info: ReactComponentInfo
        const classes = f.classes.map(c => ReactUtils.getReactClassInfo(c))
        info = classes.length ? classes[0] : undefined

        if (!info) {
          const functions = f.functions.map(fn =>
            ReactUtils.getReactFunctionInfo(fn)
          )
          info = functions.length ? functions[0] : undefined
        }

        if (!info) {
          const arrowFunctions = f.variables.map(v =>
            ReactUtils.getReactArrowFunctionInfo(v)
          )
          info = arrowFunctions.length ? arrowFunctions[0] : undefined
        }

        return {
          path: f.path,
          sourceFile: f.sourceFile,
          info
        }
      })
      .filter(f => !!f.info)
      .map(f => ({
        ...f,
        key: `${padEnd(f.info.name, 25)} ${print.colors.yellow(
          `[${this.getPath(baseDir, f.sourceFile)}]`
        )}`
      }))

    // @ts-ignore
    const { selectedReactClass } = await prompt.ask([
      {
        name: 'selectedReactClass',
        type: 'autocomplete',
        message,
        choices: files.map(f => ({ name: f.key, indicator: '> ' })),
        validate(val) {
          if (!val) {
            return 'Please choose a view'
          }
          return true
        },
        format(val) {
          if (val) {
            return val.replace(/\s\s/g, '')
          }
        }
      }
    ])

    return files.find(f => f.key === selectedReactClass)
  }

  async browseReactClasses(
    message: string,
    baseDir: string,
    dir: string = '/'
  ) {
    const {
      prompt,
      strings: { padEnd },
      print
    } = this.context

    const files = this.browseReactFiles(baseDir, dir)
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
        key: `${padEnd(f.info.name, 25)} ${print.colors.yellow(
          `[${this.getPath(baseDir, f.sourceFile)}]`
        )}`
      }))

    const { selectedReactClass } = await prompt.ask([
      {
        name: 'selectedReactClass',
        type: 'autocomplete',
        message,
        choices: files.map(f => f.key),
        format(val) {
          if (val) {
            return val.replace(/\s\s/g, '')
          }
        },
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

  async browseInterfaces(sourceFile: SourceFile, msg: string) {
    const { prompt, print } = this.context

    if (msg) {
      print.info(print.colors.yellow('• ' + msg))
    }

    const createNew = print.colors.magenta('... or create a new one.')
    const useThis = 'Use and modify this interface.'

    const interfaces = sourceFile.getInterfaces().filter(i => i.isExported())
    if (interfaces.length === 1) {
      const choices = [useThis, createNew]
      const { choosen } = await prompt.ask([
        {
          name: 'choosen',
          message: `Found ${print.colors.yellow(
            interfaces[0].getName()
          )} interface.`,
          type: 'list',
          choices,
          initial: useThis
        }
      ])

      if (choosen === useThis) {
        return interfaces[0]
      }
      this.utils.exit('Aborted')
    } else if (interfaces.length > 1) {
      const choices = [...interfaces.map(i => i.getName()), createNew]
      const { name } = await prompt.ask([
        {
          name: 'name',
          message: `Select one interface you would like to use and modify:`,
          type: 'list',
          choices,
          validate(val) {
            if (!val) {
              return 'Please select one interface to modify'
            }
            return true
          }
        }
      ])
      return interfaces.find(i => i.getName() === name)
    } else {
      return undefined
    }
  }

  getPath(baseDir: string, sourceFile: SourceFile) {
    return path.relative(baseDir, sourceFile.getFilePath()).replace(/\\/g, '/')
  }
}

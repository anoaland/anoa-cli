import * as _ from 'lodash'
import * as path from 'path'
import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import { FieldObject } from '../../generators/types'
import { ViewKindEnum } from '../../generators/views/types'
import { RootContext } from '../../tools/context'
import { ReactComponentInfo, ReactUtils } from './react-utils'
import { ReduxUtils, ThunkInfo } from './redux-utils'
import { Utils } from './utils'

export class ProjectBrowser {
  context: RootContext
  utils: Utils
  reducerList: NamePathInfo[]
  loadedViews: { [key: string]: BrowseViewInfo[] } = {}

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

  async browseViews(
    selectKindMessage: string = '',
    selectViewMessage: string = '',
    dir: string = '/'
  ): Promise<BrowseViewInfo> {
    const {
      prompt,
      strings: { isBlank }
    } = this.context

    const kind = await this.selectViewKind(selectKindMessage)

    if (isBlank(selectViewMessage)) {
      selectViewMessage = `Select a ${kind}`
    }

    const views = this.browseViewsInfo(kind, dir)

    // @ts-ignore
    const { selectedView } = await prompt.ask([
      {
        name: 'selectedView',
        type: 'autocomplete',
        message: selectViewMessage,
        choices: views.map(f => ({ name: f.key })),
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

    return views.find(f => f.key === selectedView)
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
        const info = ReactUtils.getReactClassInfo(f.sourceFile)
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

  async browseAllViews(
    multiple: boolean = false,
    message: string = 'Select screens',
    kind: ViewKindEnum = ViewKindEnum.screen
  ): Promise<BrowseViewInfo | BrowseViewInfo[]> {
    const {
      prompt,
      print: { colors }
    } = this.context
    const views = this.browseViewsInfo(kind)
    // @ts-ignore
    const { selectedViews } = await prompt.ask([
      {
        name: 'selectedViews',
        type: 'autocomplete',
        message,
        choices: views.map(f => {
          if (multiple) {
            return { name: f.key.trim(), indicator: '>' }
          }

          return { name: f.key }
        }),
        multiple,
        validate(val) {
          if (!val || (multiple && !val.length)) {
            return `Please choose a ${kind.toLowerCase()}`
          }

          return true
        },
        format(val) {
          if (!val) {
            return val
          }

          if (!multiple) {
            return val.replace(/\s\s/g, '')
          }

          return (
            '\r\n' +
            val
              .map(v => '  ' + colors.green('+') + ' ' + v.replace(/\s\s/g, ''))
              .join('\r\n')
          )
        }
      }
    ])

    if (!multiple) {
      return views.find(f => f.key === selectedViews)
    }

    return selectedViews.map(v => {
      return views.find(f => f.key.trim() === v)
    })
  }

  browseViewsInfo(kind: ViewKindEnum, dir: string = '/'): BrowseViewInfo[] {
    const {
      print,
      strings: { padEnd },
      folder
    } = this.context

    const vkey = kind + dir
    if (this.loadedViews[vkey]) {
      return this.loadedViews[vkey]
    }

    const baseDir =
      kind === ViewKindEnum.component ? folder.components() : folder.screens()

    this.loadedViews[vkey] = this.browseReactFiles(baseDir, dir)
      .map(f => {
        let info: ReactComponentInfo
        info = ReactUtils.getReactClassInfo(f)
        if (!info) {
          info = ReactUtils.getReactFunctionInfo(f)
        }
        if (!info) {
          info = ReactUtils.getReactArrowFunctionInfo(f)
        }
        return {
          path: f.getFilePath(),
          sourceFile: f,
          info,
          kind
        }
      })
      .filter(f => !!f.info)
      .map(f => ({
        ...f,
        key: `  ${padEnd(f.info.name, 25)} ${print.colors.yellow(
          `[${this.getPath(baseDir, f.sourceFile)}]`
        )}`
      }))

    return this.loadedViews[vkey]
  }

  async browseReducers(
    validate?: (
      value: NamePathInfo,
      values: { [key: string]: NamePathInfo }
    ) => Promise<boolean | string>
  ): Promise<NamePathInfo> {
    const {
      folder,
      print: { colors },
      strings: { padEnd },
      prompt
    } = this.context

    const baseDir = folder.reducers()

    const choices = this.getReducerList().reduce((acc, curr) => {
      if (curr) {
        const key = `${padEnd(curr.name, 25)} ${colors.yellow(
          `[${this.getPath(baseDir, curr.sourceFile)}]`
        )}`
        acc[key] = curr
      }
      return acc
    }, {})

    // @ts-ignore
    const { selectedReducer } = await prompt.ask([
      {
        name: 'selectedReducer',
        type: 'autocomplete',
        message: 'Please select reducer',
        choices: Object.keys(choices), // .map(f => ({ name: f.key, indicator: '> ' })),
        validate: async val => {
          if (!val) {
            return 'Please choose a reducer'
          }

          if (validate) {
            return await validate(choices[val], choices)
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

    return choices[selectedReducer]
  }

  async browseReducerStates(): Promise<Array<FieldObject<NamePathInfo>>> {
    const reducers = this.getReducerList()

    const project = new Project()
    const choices = []
    let allActChoices: { [key: string]: FieldObject<NamePathInfo> } = {}
    reducers.map(r => {
      const { stateChoices, state, reducer } = ReduxUtils.resolveStates(
        this.context,
        project,
        r,
        false
      )

      const actChoices = stateChoices()
      const actTypes = Object.keys(actChoices)
      if (actTypes.length) {
        for (const k of actTypes) {
          actChoices[k].data = reducer
        }

        choices.push({
          name: state.name,
          choices: actTypes
        })
        allActChoices = { ...allActChoices, ...actChoices }
      }
    })

    const {
      prompt,
      print: { colors }
    } = this.context

    const { states } = await prompt.ask([
      {
        name: 'states',
        type: 'autocomplete',
        message: 'Select state(s) you want to map:',
        choices,
        multiple: true,

        format(vals) {
          if (!vals || !vals.map) {
            return vals
          }

          const data = vals
            .map(v => {
              const ch = allActChoices[v]
              if (ch) {
                return {
                  state: ch.data.name,
                  field: v
                }
              }

              return false
            })
            .filter(v => !!v)

          if (!data.length) {
            return colors.magenta('No state were selected.')
          }

          return (
            '\r\n' +
            _(data)
              .groupBy(x => x.state)
              .map((value, key) => {
                return (
                  '  ' +
                  key +
                  ':\r\n' +
                  value.map(v => '    ' + v.field).join('\r\n')
                )
              })
              .value()
              .join('\r\n')
          )
        },

        result(vals) {
          if (!vals || !vals.map) {
            return []
          }

          return vals.map(s => allActChoices[s]).filter(s => !!s)
        }
      }
    ])

    return states as any
  }

  async browseReducerActionTypes() {
    const reducers = this.getReducerList()
    const project = new Project()
    const choices = []
    let allActChoices = {}
    reducers.map(r => {
      const { actionTypeChoices } = ReduxUtils.resolveActionTypes(
        this.context,
        project,
        r,
        false
      )

      const actChoices = actionTypeChoices()
      const actTypes = Object.keys(actChoices)
      if (actTypes.length) {
        choices.push({
          name: r.name,
          choices: actTypes
        })
        allActChoices = { ...allActChoices, ...actChoices }
      }
    })

    const { prompt } = this.context

    const { actionTypes } = await prompt.ask([
      {
        name: 'actionTypes',
        type: 'multiselect',
        message: 'Select action type(s) you want to map:',
        choices,

        format(vals) {
          if (!vals) {
            return vals
          }

          return '\r\n' + vals.map(v => '  ' + v).join('\r\n')
        },

        result(vals) {
          if (!vals) {
            return []
          }

          return vals.map(s => allActChoices[s])
        }
      }
    ])

    return actionTypes
  }

  async browseReduxThunks(): Promise<ThunkInfo[]> {
    const {
      filesystem: { cwd },
      folder,
      prompt,
      print: { colors }
    } = this.context

    const project = new Project()
    const files = project.addExistingSourceFiles(
      path.join(cwd(), folder.thunks('*.ts'))
    )

    if (!files.length) {
      return []
    }

    let allThunks = {}
    const choices = []
    for (const f of files) {
      const thunks = ReduxUtils.getThunksFromSourceFile(f)
      const thunkChoices = thunks
        .map(t => ({
          key: `${colors.yellow(t.name)}(${t.parameters.map(
            p => `${p.name}: ${p.type}`
          )}): ${colors.blue(t.returnType)}`,
          value: t
        }))
        .reduce((acc, curr) => {
          acc[curr.key] = curr.value
          return acc
        }, {})

      allThunks = { ...allThunks, ...thunkChoices }

      choices.push({
        name: f.getBaseName(),
        choices: Object.keys(thunkChoices)
      })
    }

    const { selectedThunks } = await prompt.ask({
      name: 'selectedThunks',
      type: 'autocomplete',
      message: 'Select thunk(s) you want to map:',
      choices,
      multiple: true,
      format(vals) {
        if (!vals || !vals.map) {
          return vals
        }
        if (!vals.length) {
          return colors.magenta('No thunk were selected.')
        }

        return '\r\n' + vals.map(v => `  ${v}`).join('\r\n')
      },
      result(vals) {
        if (!vals || !vals.map) {
          return vals
        }

        return vals
          .map(v => {
            return allThunks[v] || false
          })
          .filter(v => !!v)
      }
    })

    return selectedThunks as any
  }

  getReducerList() {
    if (this.reducerList) {
      return this.reducerList
    }

    const { folder } = this.context

    const project = new Project()
    const files = project.addExistingSourceFiles(
      path.join(folder.reducers('*/index.ts'))
    )

    this.reducerList = files
      .map<NamePathInfo | false>(f => {
        const variables = f.getVariableStatements().filter(v => {
          const typeRef = v.getFirstDescendantByKind(SyntaxKind.TypeReference)
          return (
            typeRef &&
            typeRef.getText().startsWith('Reducer<') &&
            v.isExported()
          )
        })
        if (!variables || !variables.length) {
          return false
        }
        const name = variables[0]
          .getFirstDescendantByKind(SyntaxKind.Identifier)
          .getText()

        return {
          name,
          path: f.getFilePath(),
          sourceFile: f
        }
      })
      .filter(r => r !== false) as NamePathInfo[]

    if (!this.reducerList.length) {
      this.utils.exit('No reducer found on this project. Action cancelled.')
      return
    }

    return this.reducerList
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

  async browseThemes(
    message: string = 'Select theme'
  ): Promise<ThemeInfo | null> {
    const project = new Project()
    const {
      folder,
      filesystem: { cwd },
      prompt
    } = this.context
    const stylesFile = project.addExistingSourceFile(
      path.join(cwd(), folder.styles('index.ts'))
    )

    const themes = stylesFile
      .getImportDeclarations()
      .filter(i => {
        return i
          .getModuleSpecifier()
          .getText()
          .startsWith(`'./themes/`)
      })
      .map<ThemeInfo>(i => ({
        name: i.getNamedImports()[0].getText(),
        path: path.join(
          cwd(),
          folder.themes(
            /'.\/themes\/(.*)'$/g.exec(i.getModuleSpecifier().getText())[1] +
              '.ts'
          )
        )
      }))

    if (!themes.length) {
      return null
    }

    if (themes.length === 1) {
      return themes[0]
    }

    const themesMap = themes.reduce((acc, cur) => {
      acc[cur.name] = cur
      return acc
    }, {})

    // BaseTheme should be first
    const choices = Object.keys(themesMap).filter(i => i !== 'BaseTheme')
    choices.splice(0, 0, 'BaseTheme')

    const { selectedTheme } = await prompt.ask({
      name: 'selectedTheme',
      choices,
      type: 'select',
      message,
      validate(val) {
        if (!val) {
          return 'Please select a theme.'
        }

        return true
      }
    })

    return themesMap[selectedTheme]
  }

  private getPath(baseDir: string, sourceFile: SourceFile) {
    return path.relative(baseDir, sourceFile.getFilePath()).replace(/\\/g, '/')
  }

  private browseReactFiles(baseDir, dir = '/'): SourceFile[] {
    const project = new Project()
    return project.addExistingSourceFiles(path.join(baseDir, dir, '**/*.tsx'))
  }
}

export interface NamePathInfo {
  /**
   * Name of class / interface
   */
  name: string
  /**
   * path of file
   */
  path: string
  /**
   * source file
   */
  sourceFile: SourceFile
}

export interface BrowseViewInfo {
  key: string
  path: string
  sourceFile: SourceFile
  info: ReactComponentInfo
  kind: ViewKindEnum
}

export interface ThemeInfo {
  name: string
  path: string
}

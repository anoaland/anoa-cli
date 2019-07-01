import * as _ from 'lodash'
import * as path from 'path'
import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import { Reducer } from '../libs/reducer'
import {
  ActionTypeClause,
  FieldObject,
  KeyValue,
  ReducerInfo,
  RootContext,
  ThunkInfo
} from '../types'

export class ReduxTools {
  private context: RootContext
  private reducers: ReducerInfo[]

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Determine is redux store initialized or not.
   * Will exit process if it's not ready.
   */
  ensureStoreReady() {
    const {
      filesystem: { cwd, exists },
      folder,
      tools: { utils }
    } = this.context
    if (!exists(path.join(cwd(), folder.store('index.ts')))) {
      utils().exit(
        'Aborted - Redux store is not ready. Please create at least one reducer.'
      )
    }
  }

  /**
   * Confirm user to automatically generate action types
   * based on state and prompt to select state to generate.
   * @param reducerName reducer name
   * @param stateFields state fields
   */
  async askGenerateActionTypesFromState(
    reducerName: string,
    stateFields: FieldObject[]
  ): Promise<ActionTypeClause[]> {
    if (!stateFields || !stateFields.length) {
      return []
    }

    if (reducerName.toLocaleLowerCase().endsWith('reducer')) {
      reducerName = reducerName.substr(0, reducerName.length - 7)
    }

    const {
      print: { colors },
      prompt,
      naming,
      tools
    } = this.context

    if (
      !(await tools
        .cli()
        .confirm('Do you want to generate action types from these new fields?'))
    ) {
      return []
    }

    const choices = stateFields
      .map<{ name: string; value: ActionTypeClause }>(s => {
        const name = `${naming
          .store(reducerName)
          .actionTypeName()}/SET_${naming.store(s.name).actionTypeName()}`
        return {
          name: `${colors.blue('type')}: ${colors.cyan(name)}, ${colors.blue(
            'payload'
          )}: ${colors.cyan(s.type)}`,
          value: {
            type: name,
            payload: s.type,
            state: s
          }
        }
      })
      .reduce<Partial<ActionTypeClause>>((acc, val) => {
        acc[val.name] = val.value
        return acc
      }, {})

    const { actionFields } = await prompt.ask({
      name: 'actionFields',
      message: `Select action type(s) you would like to include:`,
      type: 'select',
      choices: Object.keys(choices),
      // @ts-ignore
      multiple: true,
      format(e: any) {
        if (!e || !e.length) {
          return ''
        }
        return e.map(a => colors.yellow('\r\n  + ') + a).join('')
      }
    })

    // @ts-ignore
    return actionFields.map(a => choices[a])
  }

  /**
   * Prompt for new action types
   * @param reducerName reducer name
   */
  async askActionTypes(
    reducerName: string,
    message?: string
  ): Promise<ActionTypeClause[]> {
    const {
      prompt,
      print: { colors, fancy },
      naming
    } = this.context

    fancy(`• ${message || 'Define action types'}`)

    reducerName = naming.store(reducerName).actionTypeName()
    let stop = false
    const fields: ActionTypeClause[] = []
    const template = ` type: ${colors.cyan(
      reducerName
    )}/\${type}, payload: \${payload}`

    while (!stop) {
      const { field } = await prompt.ask([
        {
          name: 'field',
          type: 'snippet',
          message: colors.yellow('+') + ' new action',
          // @ts-ignore
          template,
          format(val: any) {
            if (stop) {
              return fields.length ? '[DONE]' : '[SKIPPED]'
            }

            const {
              values: { type, payload },
              key
            } =
              // @ts-ignore
              this.state

            const keyStr = colors.magenta(key)

            if (!val) {
              if (!payload && !type) {
                return colors.bold('Press [ENTER] to skip')
              }

              return keyStr + ': '
            }

            // display name

            if (typeof val === 'string') {
              if (key === 'type') {
                return (
                  keyStr +
                  `: ${reducerName}/` +
                  colors.cyan(naming.store(val).actionTypeName())
                )
              }
              return keyStr + ': ' + colors.cyan(val)
            }

            // display result

            if (val.values.type) {
              val.values.type =
                `${reducerName}/` +
                naming.store(val.values.type).actionTypeName()
            }

            const keys = Object.keys(val.values)
            return keys
              .map(k => colors.blue(k) + ': ' + colors.cyan(val.values[k]))
              .join(', ')
          },
          fields: [
            {
              name: 'type',
              validate(val, { values }) {
                if (!val && !values.name) {
                  stop = true
                  return true
                }

                if (!val) {
                  return 'type is required'
                }

                return true
              }
            }
          ]
        }
      ])

      if (!stop) {
        // tslint:disable-next-line:prefer-const
        let { type, payload } = field.values

        fields.push({
          type,
          payload
        })
      }
    }

    return fields
  }

  async selectActionType(reducer: Reducer): Promise<ActionTypeClause> {
    const fields = reducer.getActionTypes().getClauses()
    if (!fields || !fields.length) {
      return undefined
    }

    const {
      prompt,
      print: { colors }
    } = this.context

    const choices = fields
      .map(p => {
        let key = colors.blue('type') + ': ' + colors.yellow(p.type)

        if (p.payload) {
          key += ', ' + colors.blue('payload') + ': ' + colors.yellow(p.payload)
        }

        return {
          key,
          value: p
        }
      })
      .reduce((acc, curr) => {
        acc[curr.key] = curr.value
        return acc
      }, {})

    const { actionTypeKey } = await prompt.ask({
      name: 'actionTypeKey',
      type: 'select',
      message: 'Select an action type',
      choices: Object.keys(choices),
      validate(val) {
        if (!val) {
          return 'Please select an action type.'
        }

        return true
      }
    })

    return choices[actionTypeKey]
  }

  async selectReducer(
    validate?: (
      value: ReducerInfo,
      values: KeyValue<ReducerInfo>
    ) => Promise<boolean | string>
  ): Promise<Reducer> {
    const {
      print: { colors },
      strings: { padEnd },
      prompt,
      tools: { utils }
    } = this.context

    const reducers = this.getReducers()

    if (!reducers.length) {
      utils().exit(`Can't find any reducer`)
    }

    const choices = reducers.reduce<KeyValue<ReducerInfo>>((acc, curr) => {
      if (curr) {
        const key = `  ${padEnd(curr.name, 25)} ${colors.yellow(
          `[${utils().relativePath(curr.sourceFile.getFilePath())}]`
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
        choices: Object.keys(choices).map(f => {
          return {
            name: f,
            indicator: '> '
          }
        }),
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

    return new Reducer(this.context, choices[selectedReducer])
  }

  /**
   * Select one or more state from states in all reducers
   * @param message prompt message
   */
  async selectStates(message?: string): Promise<Array<FieldObject<Reducer>>> {
    const {
      strings: { camelCase },
      prompt,
      print: { colors, checkmark }
    } = this.context
    const reducers = this.getReducers().map(r => new Reducer(this.context, r))

    const allStates: KeyValue<KeyValue<FieldObject<Reducer>>> = {}
    const reducerMapNames: KeyValue<string> = {}

    // build hierarchical state
    for (const r of reducers) {
      const key = colors.gray(camelCase(r.name.replace(/Reducer$/, '')))
      reducerMapNames[key] = r.name
      const stateFields = r.getState().getFields()
      allStates[key] = {}
      for (const f of stateFields) {
        allStates[key][
          `${key}.${colors.cyan(f.name)} <${colors.green(f.type)}>`
        ] = { ...f, data: r }
      }
    }

    const choices = Object.keys(allStates).map(rKey => {
      return {
        name: colors.yellow(reducerMapNames[rKey]),
        choices: Object.keys(allStates[rKey]).map(fKey => {
          return fKey
        })
      }
    })

    // @ts-ignore
    const { states } = await prompt.ask({
      name: 'states',
      type: 'autocomplete',
      message: message || 'Select state(s)',
      choices,
      // @ts-ignore
      multiple: true,
      format(vals: any) {
        if (!vals || !vals.map) {
          return vals
        }

        const data = vals
          .filter(c => c.indexOf('.') > 0)
          .map(c => {
            const keys = c.split('.')
            return {
              r: reducerMapNames[keys[0]],
              f: keys[1]
            }
          })

        if (!data.length) {
          return colors.magenta('No state were selected.')
        }

        return (
          '\r\n' +
          _(data)
            .groupBy(x => x.r)
            .map((value, key) => {
              return (
                '  ' +
                checkmark +
                ' ' +
                colors.yellow(key) +
                ':\r\n' +
                value.map(v => '    ' + v.f).join('\r\n')
              )
            })
            .value()
            .join('\r\n')
        )
      }
    })

    return (states as string[])
      .filter(c => c.indexOf('.') > 0)
      .map(c => {
        const keys = c.split('.')
        return allStates[keys[0]][c]
      })
  }

  /**
   * Select one or more thunks
   * @param message prompt message
   */
  async selectThunks(message?: string): Promise<ThunkInfo[]> {
    const {
      filesystem: { cwd },
      folder,
      prompt,
      print: { colors, checkmark }
    } = this.context

    const project = new Project()
    const files = project.addExistingSourceFiles(
      path.join(cwd(), folder.thunks('*.ts'))
    )

    if (!files.length) {
      return []
    }

    const allThunks: KeyValue<KeyValue<ThunkInfo>> = {}
    const thunkFileMaps: KeyValue<string> = {}

    for (const f of files) {
      const filename = path.basename(f.getFilePath())
      const key = colors.gray(filename.replace('.ts', ''))

      thunkFileMaps[key] = filename
      const thunks = this.getThunks(f)
      allThunks[key] = {}

      for (const t of thunks) {
        allThunks[key][
          `${key}.${colors.cyan(t.name)}(${t.parameters.map(
            p => `${p.name}: ${colors.green(p.type)}`
          )}): ${colors.blue(t.returnType)}`
        ] = t
      }
    }

    const choices = Object.keys(allThunks).map(rKey => {
      return {
        name: colors.yellow(thunkFileMaps[rKey]),
        choices: Object.keys(allThunks[rKey]).map(fKey => {
          return fKey
        })
      }
    })

    // @ts-ignore
    const { selectedThunks } = await prompt.ask({
      name: 'selectedThunks',
      type: 'autocomplete',
      message: message || 'Select thunk(s)',
      choices,
      // @ts-ignore
      multiple: true,
      format(vals: any) {
        if (!vals || !vals.map) {
          return vals
        }

        const data = vals
          .filter(c => c.indexOf('.') > 0 && c.indexOf('.ts') < 0)
          .map(c => {
            const keys = c.split('.')
            return {
              file: thunkFileMaps[keys[0]],
              thunk: keys[1]
            }
          })

        if (!data.length) {
          return colors.magenta('No state were selected.')
        }

        return (
          '\r\n' +
          _(data)
            .groupBy(x => x.file)
            .map((value, key) => {
              return (
                '  ' +
                checkmark +
                ' ' +
                colors.yellow(key) +
                ':\r\n' +
                value.map(v => '    ' + v.thunk).join('\r\n')
              )
            })
            .value()
            .join('\r\n')
        )
      }
    })

    return (selectedThunks as string[])
      .filter(c => c.indexOf('.') > 0 && c.indexOf('.ts') < 0)
      .map(c => {
        const keys = c.split('.')
        return allThunks[keys[0]][c]
      })
  }

  getThunks(sourceFile: SourceFile): ThunkInfo[] {
    const thunks = sourceFile.getFunctions().filter(f => {
      const rtn = f.getReturnTypeNode()
      return rtn && rtn.getText().startsWith('AppThunkAction')
    })

    const filePath = sourceFile.getFilePath()
    return thunks.map<ThunkInfo>(t => {
      const rtMatch = /AppThunkAction<(.*?)>$/g.exec(
        t.getReturnTypeNode().getText()
      )
      const returnType = rtMatch && rtMatch.length === 2 ? rtMatch[1] : 'void'

      return {
        name: t.getName(),
        parameters: t.getParameters().map<FieldObject>(p => ({
          name: p.getName(),
          type: p.getTypeNode().getText(),
          optional: false
        })),
        path: filePath,
        returnType
      }
    })
  }

  getReducers(): ReducerInfo[] {
    if (this.reducers) {
      return this.reducers
    }

    const {
      folder,
      tools: { utils }
    } = this.context

    const project = new Project()
    const files = project.addExistingSourceFiles(
      path.join(folder.reducers('*/index.ts'))
    )

    this.reducers = files
      .map<ReducerInfo | false>(f => {
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
          sourceFile: f
        }
      })
      .filter(r => r !== false) as ReducerInfo[]

    if (!this.reducers.length) {
      utils().exit('No reducer found on this project. Action cancelled.')
      return
    }

    return this.reducers
  }
}

import { RootContext } from '../../libs'
import { Utils } from './utils'

export class ObjectBuilder {
  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(this.context)
  }

  async queryUserInput(useInitialValue?: boolean) {
    const {
      prompt,
      print,
      strings: { camelCase }
    } = this.context

    let stop = false
    const fields: FieldObject[] = []
    const template = useInitialValue
      ? ` name: \${name}, type: \${type}, initial value: \${initial}`
      : ` name: \${name}, type: \${type}`

    while (!stop) {
      const { field } = await prompt.ask([
        {
          name: 'field',
          type: 'snippet',
          message: print.colors.yellow('+') + ' new field',
          // @ts-ignore
          template,
          format(val) {
            if (stop) {
              return fields.length ? '[DONE]' : '[SKIPPED]'
            }

            const {
              values: { name, type },
              key
            } =
              // @ts-ignore
              this.state

            const keyStr = print.colors.magenta(key)

            if (!val) {
              if (!name && !type) {
                return print.colors.bold('Press [ENTER] to skip')
              }

              return keyStr + ': '
            }

            // display name

            if (typeof val === 'string') {
              if (key === 'name') {
                const optional = val && val.endsWith('?')
                return (
                  keyStr +
                  ': ' +
                  print.colors.cyan(camelCase(val)) +
                  (optional ? '?' : '') +
                  print.colors.bold(' add (?) mark for optional field')
                )
              }

              return keyStr + ': ' + print.colors.cyan(val)
            }

            // display result

            if (val.values.name) {
              const optional = val.values.name.endsWith('?')
              val.values.name = camelCase(val.values.name)
              if (optional) {
                val.values.name += '?'
              }
            }

            const keys = Object.keys(val.values)
            return keys
              .map(
                k =>
                  print.colors.blue(k) + ': ' + print.colors.cyan(val.values[k])
              )
              .join(', ')
          },
          fields: [
            {
              name: 'name',
              validate(val, { values }) {
                if (!val && !values.type) {
                  stop = true
                  return true
                }

                if (!val) {
                  return 'name is required'
                }

                return true
              }
            },
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
            },
            {
              name: 'initial',
              validate(val, { values }) {
                if (!val && values.name && !values.name.endsWith('?')) {
                  return 'required field must have initial value'
                }

                return true
              }
            }
          ]
        }
      ])

      if (!stop) {
        // tslint:disable-next-line:prefer-const
        let { name, type, initial } = field.values
        let optional = false
        if (name.endsWith('?')) {
          optional = true
          name = name.substr(0, name.length - 1)
        }
        fields.push({
          name: camelCase(name),
          type,
          initial,
          optional
        })
      }
    }

    return fields
  }

  async queryFieldsToRemove(fields: FieldObject[]) {
    const { prompt, print } = this.context

    const choices = fields.map(f => ({
      name: f.name,
      message: `${f.name}:${f.type}`,
      value: f,
      indicator(_e, val) {
        return '  ' + (val.enabled ? print.xmark : print.colors.green('+'))
      }
    }))

    // @ts-ignore
    const { keys } = await prompt.ask([
      {
        name: 'keys',
        message: `Select field(s) you'd like to ${print.colors.red(
          'remove'
        )} (optional)`,
        type: 'multiselect',
        choices
      }
    ])

    return choices.filter(c => keys.indexOf(c.name) < 0).map(c => c.value)
  }

  async queryReduxActionsBasedOnState(
    reducerName: string,
    stateFields: FieldObject[]
  ): Promise<FieldObject[]> {
    if (!stateFields || !stateFields.length) {
      return []
    }

    if (reducerName.toLocaleLowerCase().endsWith('reducer')) {
      reducerName = reducerName.substr(0, reducerName.length - 7)
    }

    const {
      print: { colors },
      prompt,
      naming
    } = this.context

    if (
      !(await this.utils.confirm(
        'Do you want to generate action types from these new fields?'
      ))
    ) {
      return []
    }

    const choices = stateFields
      .map(s => {
        const name = `${naming
          .store(reducerName)
          .actionTypeName()}/SET_${naming.store(s.name).actionTypeName()}`
        return {
          name: `${colors.blue('type')}: ${colors.cyan(name)}, ${colors.blue(
            'payload'
          )}: ${colors.cyan(s.type)}`,
          value: {
            name,
            type: s.type,
            optional: s.optional,
            data: s
          }
        }
      })
      .reduce((acc, val) => {
        acc[val.name] = val.value
        return acc
      }, {})

    const { actionFields } = await prompt.ask({
      name: 'actionFields',
      message: `Select action type(s) you would like to include:`,
      type: 'select',
      choices: Object.keys(choices),
      multiple: true,
      format(e) {
        if (!e || !e.length) {
          return ''
        }
        return e.map(a => colors.yellow('\r\n  + ') + a).join('')
      }
    })

    // @ts-ignore
    return actionFields.map(a => choices[a])
  }

  async queryReduxActionTypesInput(
    reducerName: string
  ): Promise<FieldObject[]> {
    const { prompt, print, naming } = this.context

    reducerName = naming.store(reducerName).actionTypeName()
    let stop = false
    const fields: FieldObject[] = []
    const template = ` type: ${print.colors.cyan(
      reducerName
    )}/\${type}, payload: \${payload}`

    while (!stop) {
      const { field } = await prompt.ask([
        {
          name: 'field',
          type: 'snippet',
          message: print.colors.yellow('+') + ' new action',
          // @ts-ignore
          template,
          format(val) {
            if (stop) {
              return fields.length ? '[DONE]' : '[SKIPPED]'
            }

            const {
              values: { type, payload },
              key
            } =
              // @ts-ignore
              this.state

            const keyStr = print.colors.magenta(key)

            if (!val) {
              if (!payload && !type) {
                return print.colors.bold('Press [ENTER] to skip')
              }

              return keyStr + ': '
            }

            // display name

            if (typeof val === 'string') {
              if (key === 'type') {
                return (
                  keyStr +
                  `: ${reducerName}/` +
                  print.colors.cyan(naming.store(val).actionTypeName())
                )
              }
              return keyStr + ': ' + print.colors.cyan(val)
            }

            // display result

            if (val.values.type) {
              val.values.type =
                `${reducerName}/` +
                naming.store(val.values.type).actionTypeName()
            }

            const keys = Object.keys(val.values)
            return keys
              .map(
                k =>
                  print.colors.blue(k) + ': ' + print.colors.cyan(val.values[k])
              )
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
          name: type,
          type: payload,
          optional: false
        })
      }
    }

    return fields
  }
}

export interface FieldObject {
  name: string
  type: string
  optional: boolean
  initial?: string
  data?: any
}

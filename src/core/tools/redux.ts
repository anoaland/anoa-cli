import { FieldObject, RootContext } from '../types'

export class ReduxTools {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
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

  /**
   * Prompt for new action types
   * @param reducerName reducer name
   */
  async askActionTypes(
    reducerName: string,
    message?: string
  ): Promise<FieldObject[]> {
    const {
      prompt,
      print: { colors, fancy },
      naming
    } = this.context

    fancy(`• ${message || 'Define action types'}`)

    reducerName = naming.store(reducerName).actionTypeName()
    let stop = false
    const fields: FieldObject[] = []
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
          name: type,
          type: payload,
          optional: false
        })
      }
    }

    return fields
  }
}

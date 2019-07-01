import * as path from 'path'
import { ReactView } from '../libs/react-view'
import { FieldObject, RootContext, ViewKindEnum, ViewTypeEnum } from '../types'

export class CliTools {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async askFieldObjects(
    title?: string,
    useType: boolean = true,
    useInitialValue: boolean = false,
    initialValueIsOptional: boolean = false
  ): Promise<FieldObject[]> {
    const {
      prompt,
      print: { fancy, colors },
      strings: { camelCase }
    } = this.context

    if (title) {
      fancy(colors.yellow(`• ${title}:`))
    }

    let stop = false
    const fields: FieldObject[] = []
    let template = ` name: \${name}`
    if (useType) {
      template += `, type: \${type}`
    }
    if (useInitialValue) {
      template += `, ${colors.yellow(`initial value: \${initial}`)}`
    }

    while (!stop) {
      const { field } = await prompt.ask([
        {
          name: 'field',
          type: 'snippet',
          message: colors.yellow('+') + ' new field',
          // @ts-ignore
          template,
          format(val: any) {
            if (stop) {
              return fields.length ? '[DONE]' : '[SKIPPED]'
            }

            const {
              values: { name, type },
              key
            } =
              // @ts-ignore
              this.state

            const keyStr = colors.magenta(key)

            if (!val) {
              if (!name && !type) {
                return colors.bold('Press [ENTER] to skip')
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
                  colors.cyan(camelCase(val)) +
                  (optional ? '?' : '') +
                  colors.bold(' add (?) mark for optional field')
                )
              }

              return keyStr + ': ' + colors.cyan(val)
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
              .map(k => colors.blue(k) + ': ' + colors.cyan(val.values[k]))
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
                if (initialValueIsOptional) {
                  return true
                }

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

  async askFieldObjectsToBeRemoved(fields: FieldObject[], title?: string) {
    const {
      prompt,
      print: { fancy, colors, xmark }
    } = this.context

    if (title) {
      fancy(colors.yellow(`• ${title}:`))
    }

    const choices = fields.map(f => ({
      name: f.name,
      message: `${colors.bold(f.name)}${f.type ? `:${f.type}` : ''}`,
      value: f,
      indicator(_e, val) {
        return '  ' + (val.enabled ? xmark : colors.green('+'))
      }
    }))

    // @ts-ignore
    const { keys } = await prompt.ask([
      {
        name: 'keys',
        message: `Select field(s) you'd like to ${colors.red(
          'remove'
        )} (optional)`,
        type: 'multiselect',
        choices
      }
    ])

    return choices.filter(c => keys.indexOf(c.name) < 0).map(c => c.value)
  }

  async browseViews(
    kind?: ViewKindEnum,
    multiple: boolean = false,
    message?: string
  ): Promise<ReactView | ReactView[]> {
    const {
      prompt,
      print: { colors, spin },
      strings: { lowerCase, plural },
      tools
    } = this.context

    if (!kind) {
      kind = await this.selectViewKind()
    }

    const project = tools.project()
    const kindStr = lowerCase(plural(kind))
    const spinner = spin(`Browsing ${kindStr}...`)
    const views = project.viewList(kind)

    if (!message) {
      message = `Select ${kindStr}`
    }

    spinner.stop()

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
        // @ts-ignore
        multiple,
        validate(val) {
          if (!val || (multiple && !val.length)) {
            return `Please choose a ${kind.toLowerCase()}`
          }

          return true
        },
        format(val: any) {
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

  /**
   * Select target view kind
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

  /**
   * Select a directory.
   * Will not prompt anything if rootDir not contains any directory.
   * @param rootDir root directory
   * @param message prompt message
   */
  async selectFolder(rootDir: string, message?: string): Promise<string> {
    const { tools, prompt } = this.context
    let location = '/'
    const project = tools.project()
    const dirs = project.dirListDeep(rootDir)

    if (dirs && dirs.length > 0) {
      dirs.splice(0, 0, '/')
      ;({ location } = await prompt.ask({
        name: 'location',
        message: message || `Folder/location (relative to ${rootDir}):`,
        type: 'autocomplete',
        choices: dirs,
        initial: '/'
      }))
    }
    return path.join(rootDir, location)
  }

  /**
   * Select view type prompt
   */
  async selectViewType(
    kind: ViewKindEnum = ViewKindEnum.component
  ): Promise<ViewTypeEnum> {
    const {
      strings: { lowerCase },
      prompt
    } = this.context

    const { type } = await prompt.ask({
      name: 'type',
      message: `What ${lowerCase(kind)} type do you prefer?`,
      type: 'select',
      choices: [
        ViewTypeEnum.classComponent,
        ViewTypeEnum.functionComponent,
        ViewTypeEnum.arrowFunctionComponent
      ],
      initial: ViewTypeEnum.classComponent
    })

    return type as ViewTypeEnum
  }

  /**
   * Show Yes or No confirmation prompt
   * @param message Confirmation message
   */
  async confirm(
    message: string,
    defaultAnswer: 'Y' | 'N' = 'Y'
  ): Promise<boolean> {
    const { prompt } = this.context

    return await prompt.confirm(message, defaultAnswer === 'Y')
  }
}

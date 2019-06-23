import * as path from 'path'
import { RootContext } from '../types'

export class Utils {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Show warning message and exit the process.
   * @param message Warning message
   */
  exit(message: string) {
    const { print } = this.context
    print.warning(message)
    return process.exit(0)
  }

  /**
   * Show Yes or No confirmation prompt
   * @param message Confirmation message
   */
  async confirm(
    message: string,
    defaultAnswer: 'Y' | 'N' = 'Y'
  ): Promise<boolean> {
    const {
      print: { colors },
      prompt
    } = this.context

    const { confirm } = await prompt.ask({
      type: 'confirm',
      name: 'confirm',
      message:
        message + colors.gray(defaultAnswer === 'Y' ? ' (Y/n)' : '(y/N)'),
      default: defaultAnswer,
      initial: 'true',
      format: (res: boolean) => (res ? 'Yes' : 'No')
    })

    return confirm as any
  }

  /**
   * Get actual error message from system error object.
   * @param error system error object
   */
  getSystemErrorMessage(error: any): string {
    const {
      print: { colors }
    } = this.context
    return colors.error(error.stderr ? error.stderr : error.toString())
  }

  /**
   * Show help messages if found -h or --help parameters
   * @param helps help messages in key value string
   * @param pad pad between key and value
   * @param title title
   */
  handlePrintHelps(helps: Helps, title?: string, pad: number = 30) {
    const {
      parameters: { options }
    } = this.context
    if (options && (options.h || options.help)) {
      this.printHelps(helps, title, pad)
      process.exit(0)
    }
  }

  /**
   * Print help messages
   * @param helps help messages in key value string
   * @param pad pad between key and value
   * @param title title
   */
  printHelps(helps: Helps, title?: string, pad: number = 30) {
    const {
      print: { colors, info, newline },
      strings: { padEnd }
    } = this.context

    if (title) {
      newline()
      info('  ' + title)
    }
    const keys = Object.keys(helps)
    for (const key of keys) {
      const contents = helps[key]
      if (typeof contents === 'object') {
        newline()
        info(`  ${colors.bold(key)}:`)
        newline()
        for (const k of Object.keys(contents)) {
          info(`    ${padEnd(k, pad)} ${contents[k]}`)
        }
      } else {
        info(`    ${padEnd(key, pad)} ${helps[key]}`)
      }
    }
    newline()
  }

  /**
   * Convert variable name to readable title. (eg: 'awesome-todo' to 'Awesome Todo')
   * @param varName variable name
   */
  varNameToWords(varName: string): string {
    const {
      strings: { snakeCase, upperFirst }
    } = this.context
    return snakeCase(varName)
      .split('_')
      .map(s1 => upperFirst(s1))
      .join(' ')
  }

  relativePath(fullPath: string): string {
    const {
      filesystem: { cwd }
    } = this.context

    return path.relative(cwd(), fullPath)
  }
}

export type Helps = { [key: string]: string | Helps }

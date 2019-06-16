import { RootContext } from '../../libs'

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
}

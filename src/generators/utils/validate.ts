import { RootContext } from '../../tools/context'

export class ValidateUtils {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  dirName(name: string, value: string) {
    const notEmpty = this.notEmpty(name, value)
    if (notEmpty !== true) {
      return notEmpty
    }

    if (!/^[a-z_][a-z0-9-_]+$/i.test(value)) {
      return `${name} should be alphanumeric with no space begining with alphabet.`
    }

    return true
  }

  androidPackageName(name: string, value: string) {
    const notEmpty = this.notEmpty(name, value)
    if (notEmpty !== true) {
      return notEmpty
    }

    if (
      !/^(?:[a-zA-Z]+(?:\d*[a-zA-Z_]*)*)(?:\.[a-zA-Z]+(?:\d*[a-zA-Z_]*)*)+$/i.test(
        value
      )
    ) {
      return `${name} is not valid identifier.`
    }

    return true
  }

  /**
   * Field should not be blank.
   * @param name field name
   * @param value value
   */
  notEmpty(name: string, value: string) {
    const {
      strings: { isBlank }
    } = this.context
    if (isBlank(value)) {
      return `${name} can not be blank`
    }

    return true
  }
}

import { ExpoBoilerplateArgs } from '../../../generators/boilerplates/expo/types'
import { Utils } from '../../../generators/utils'
import { ValidateUtils } from '../../../generators/utils/validate'
import { RootContext } from '../../../tools/context'

export class ExpoBoilerplateServiceQA {
  context: RootContext
  validateUtils: ValidateUtils
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.validateUtils = new ValidateUtils(context)
    this.utils = new Utils(context)
  }

  async run(dir: string): Promise<ExpoBoilerplateArgs> {
    const {
      prompt,
      parameters: { options },
      print: { warning }
    } = this.context

    if (!dir) {
      ;({ dir } = await prompt.ask({
        name: 'dir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => this.validateUtils.dirName('Project directory', val)
      }))
    }

    let { name, slug } = options

    if (!name) {
      const defaultName = this.utils.varNameToWords(dir)
      ;({ name } = await prompt.ask({
        name: 'name',
        type: 'input',
        message: `Name of project visible on the home screen`,
        validate: val => this.validateUtils.notEmpty('Project name', val),
        initial: defaultName
      }))
    }

    if (slug) {
      const validateSlug = this.validateUtils.dirName('Slug or url', slug)
      if (validateSlug !== true) {
        warning(validateSlug)
        slug = undefined
      }
    }
    if (!slug) {
      ;({ slug } = await prompt.ask({
        name: 'slug',
        type: 'input',
        message: `Slug or url friendly of your project`,
        validate: val => this.validateUtils.dirName('Slug or url', val),
        initial: dir
      }))
    }

    return {
      dir,
      name,
      slug
    }
  }
}

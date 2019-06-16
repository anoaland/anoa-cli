import { ExpoBoilerplateArgs } from '../../../generators/boilerplates/expo/types'
import { ValidateUtils } from '../../../generators/utils/validate'
import { RootContext } from '../../../libs'

export class ExpoBoilerplateServiceQA {
  context: RootContext
  validateUtils: ValidateUtils

  constructor(context: RootContext) {
    this.context = context
    this.validateUtils = new ValidateUtils(context)
  }

  async run(dir: string): Promise<ExpoBoilerplateArgs> {
    const {
      prompt,
      parameters: { options },
      print: { warning }
    } = this.context

    if (!dir) {
      const { projectDir } = await prompt.ask({
        name: 'projectDir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => this.validateUtils.dirName('Project directory', val)
      })
      dir = projectDir
    }

    let { name, slug } = options

    if (!name) {
      ;({ name } = await prompt.ask({
        name: 'name',
        type: 'input',
        message: 'Name of project visible on the home screen (eg: Cool App)',
        validate: val => this.validateUtils.notEmpty('Project name', val)
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
        message: 'Slug or url friendly of your project (eg: cool-app)',
        validate: val => this.validateUtils.dirName('Slug or url', val)
      }))
    }

    return {
      dir,
      name,
      slug
    }
  }
}

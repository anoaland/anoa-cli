import { RootContext } from '../../../core/types'
import { ExpoBoilerplateArgs } from '../../../generators/boilerplates/expo/types'

export class ExpoBoilerplateServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(dir: string): Promise<ExpoBoilerplateArgs> {
    const {
      prompt,
      parameters: { options },
      print: { warning },
      tools
    } = this.context

    if (!dir) {
      ;({ dir } = await prompt.ask({
        name: 'dir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => tools.validate().dirName('Project directory', val)
      }))
    }

    let { name, slug } = options

    if (!name) {
      const defaultName = tools.utils().varNameToWords(dir)
      ;({ name } = await prompt.ask({
        name: 'name',
        type: 'input',
        message: `Name of project visible on the home screen`,
        validate: val => tools.validate().notEmpty('Project name', val),
        initial: defaultName
      }))
    }

    if (slug) {
      const validateSlug = tools.validate().dirName('Slug or url', slug)
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
        validate: val => tools.validate().dirName('Slug or url', val),
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

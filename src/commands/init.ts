import { RootContext } from '../libs'
import { Boilerplate, ProjectTypes } from '../services/boilerplates'

export default {
  name: 'init',
  alias: ['i'],
  description: 'Generate new react native boilerplate',
  run: async (context: RootContext) => {
    const {
      parameters: { first: projectDir },
      prompt
    } = context

    // ask user for project type
    const { projectType } = await prompt.ask([
      {
        name: 'projectType',
        message: 'Select project type you would like to use:',
        type: 'list',
        choices: [ProjectTypes.REACT_NATIVE_INIT, ProjectTypes.EXPO]
      }
    ])

    // generate the boilerplate
    await new Boilerplate(context).init(projectType as ProjectTypes, projectDir)
  }
}

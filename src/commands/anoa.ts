import { GluegunRunContext } from 'gluegun'

module.exports = {
  name: 'anoa',
  hidden: 'true',
  run: async (context: GluegunRunContext) => {
    const { print } = context

    print.success('          .d8888b. 88d888b. .d8888b. .d8888b. ')
    print.success("          88'  `88 88'  `88 88'  `88 88'  `88 ")
    print.success('          88.  .88 88    88 88.  .88 88.  .88 ')
    print.success("           88888P8 dP    dP `88888P' `88888P8 ")
    print.info('=========================================================')
    print.info('  React Native Typescript Boilerplate & Scaffolder CLI')
    print.printCommands(context)
  },
}

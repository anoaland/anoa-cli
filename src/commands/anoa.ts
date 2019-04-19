export default {
  name: 'anoa',
  hidden: 'true',
  run: async (context: any) => {
    const { print, runtime } = context

    print.success('            .d8888b. 88d888b. .d8888b. .d8888b. ')
    print.success("            88'  `88 88'  `88 88'  `88 88'  `88 ")
    print.success('            88.  .88 88    88 88.  .88 88.  .88 ')
    print.success("             88888P8 dP    dP `88888P' `88888P8 ")
    print.info('============================================================')
    print.info('  React Native Typescript Boilerplate & Code Generator CLI')
    runtime.run('help')
  }
}

import { build, print } from 'gluegun'

async function run(argv) {
  // create a CLI runtime
  const cli = build()
    .brand('anoa')
    .src(__dirname)
    .plugins('./node_modules', { matching: 'anoa-*', hidden: true })
    .help({
      name: 'help',
      alias: ['h'],
      description: 'Show list of commands',
    }) // provides default for help, h, --help, -h
    .version() // provides default for version, v, --version, -v
    .create()

  // show header
  header()

  const args: string[] = argv.slice(2)

  const validCommands = [
    '-h',
    '--help',
    '-v',
    'v',
    '--version',
    'i',
    'init',
    'store',
    's',
    'view',
    'v'
  ]
  const showHelp =
    !args.length ||
    args.indexOf('-h') === 0 ||
    args.indexOf('--help') === 0 ||
    validCommands.indexOf(args[0]) < 0

  // show help as default
  if (showHelp) {
    print.printCommands(await cli.run('help'))
    return
  }

  await cli.run(argv)
}

function header() {
  print.newline()
  print.success('          .d8888b. 88d888b. .d8888b. .d8888b. ')
  print.success("          88'  `88 88'  `88 88'  `88 88'  `88 ")
  print.success('          88.  .88 88    88 88.  .88 88.  .88 ')
  print.success("           88888P8 dP    dP `88888P' `88888P8 ")
  print.info('=========================================================')
  print.info('  React Native Typescript Boilerplate & Scaffolder CLI')
  print.newline()
}

module.exports = { run }

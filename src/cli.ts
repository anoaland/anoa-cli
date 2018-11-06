import { build, GluegunRunContext } from 'gluegun'

async function run(argv) {
  // create a CLI runtime
  const cli = build()
    .brand('anoa')
    .src(__dirname)
    .plugins('./node_modules', { matching: 'anoa-*', hidden: true })
    .help({
      name: 'help',
      alias: ['-h'],
      description: 'Show list of commands',
      dashed: true,
      run: (ctx: GluegunRunContext) => {
        ctx.print.printCommands(ctx)
      },
    }) // provides default for help, h, --help, -h
    .version({
      name: 'version',
      alias: ['-v'],
      description: 'Show version',
      dashed: true,
      run: (ctx: GluegunRunContext) => {
        ctx.print.info('Hola!')
      },
    })
    .defaultCommand({
      run: (ctx: GluegunRunContext) => {
        ctx.runtime.run('anoa')
      },
    })
    .create()

  const args: string[] = argv.slice(2)
  if (args[0] === '-v') {
    cli.run('version')
    return
  }

  if (args[0] === '-h') {
    cli.run('help')
    return
  }

  await cli.run(argv)
}

module.exports = { run }

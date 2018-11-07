import { build } from 'gluegun'
import { RootContext } from './libs'

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
      run: ({ meta, print, strings: { padEnd } }: RootContext) => {
        print.newline()
        const commands = meta.commandInfo()
        commands.filter(c => c[0].trim() !== 'anoa').forEach(c => {
          print.info(padEnd(c[0], 25) + c[1])
        })
      },
    }) // provides default for help, h, --help, -h
    .version({
      name: 'version',
      alias: ['-v'],
      description: 'Show version',
      dashed: true,
      run: (ctx: RootContext) => {
        ctx.print.info(ctx.meta.version())
      },
    })
    .defaultCommand({
      run: (ctx: RootContext) => {
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

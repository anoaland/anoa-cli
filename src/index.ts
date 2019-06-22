import { build, print } from 'gluegun'
import { RootContext } from './tools/context'

async function run(argv) {
  const cli = build()
    .brand('anoa')
    .src(__dirname)
    .plugins('node_modules', { matching: 'anoa-*' })
    .help({
      name: 'help',
      alias: ['-h'],
      description: 'Show list of commands',
      dashed: true,
      run: ({ meta, strings: { padEnd } }: RootContext) => {
        print.newline()
        const commands = meta.commandInfo()
        commands
          .filter(c => c[0].trim() !== 'anoa')
          .forEach(c => {
            print.info(padEnd(c[0], 25) + c[1])
          })
      }
    })
    .version({
      name: 'version',
      alias: ['-v'],
      description: 'Show version',
      dashed: true,
      run: (ctx: RootContext) => {
        print.info(ctx.meta.version())
      }
    })
    .defaultCommand({
      run: (ctx: RootContext) => {
        // fallback '-v' command
        if (ctx.parameters.options.v) {
          ctx.runtime.run('version')
          return
        }

        ctx.runtime.run('anoa')
      }
    })
    .create()

  try {
    await cli.run(argv)
  } catch (error) {
    print.info(`${print.xmark} Aborted.`)
    if (error) {
      print.error(error)
    }
  }
}

module.exports = { run }

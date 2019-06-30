import { build, print } from 'gluegun'
import * as PrettyError from 'pretty-error'
import { RootContext } from './core/types'

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
      run: ({
        print: { newline, info },
        meta,
        strings: { padEnd }
      }: RootContext) => {
        newline()
        const commands = meta.commandInfo()
        commands.forEach(c => {
          info(padEnd('  ' + c[0], 18) + c[1])
        })
      }
    })
    .version({
      name: 'version',
      alias: ['-v'],
      description: 'Show version',
      dashed: true,
      run: ({ print: { info }, meta }: RootContext) => {
        info(meta.version())
      }
    })
    .create()

  try {
    await cli.run(argv)
  } catch (error) {
    print.info(`${print.xmark} Aborted.`)
    if (error) {
      new PrettyError().render(error)
    }
  }
}

module.exports = { run }

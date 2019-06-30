import { RootContext } from '../core/types'

export default {
  name: 'anoa',
  hidden: true,
  run: (context: RootContext) => {
    const {
      print: {
        colors: { cyan, bold, yellow },
        newline,
        info
      },
      parameters,
      runtime
    } = context

    if (parameters.options.v) {
      runtime.run('version')
      return
    }

    if (parameters.options.h) {
      runtime.run('help')
      return
    }

    newline()
    info(bold(cyan('             ▄█████▄ ██▄███▄   ▄████▄   ▄█████▄ ')))
    info(cyan('            ██▀   ██ ██▀  ▀██ ██▀  ▀██ ██▀   ██ '))
    info(yellow('            ██    ██ ██    ██ ██▄  ▄██ ██    ██ '))
    info(bold(yellow('             ▀███▀██ ██    ██  ▀████▀   ▀███▀██ ')))
    info('____________________________________________________________')
    newline()
    info(bold('  React Native Typescript Boilerplate & Code Generator CLI'))
    runtime.run('help')
    newline()
  }
}

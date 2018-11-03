module.exports = context => {
  context.npm = args => {
    const cmd = context.yarn ? 'yarn' : 'npm'
    return context.system.run(cmd + ' ' + args)
  }

  context.npmAddDevPackages = (pacakges: string[]) => {
    return context.npm('add -D ' + pacakges.join(' '))
  }

  context.generateFiles = async (template, files) => {
    const {
      template: { generate },
    } = context

    for (const file of files) {
      await generate({
        template: `${template}/${file}.ejs`,
        target: file,
      })
    }
  }
}

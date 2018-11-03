module.exports = context => {
  context.init = async () => {
    try {
      const res = await context.system.run('yarn -v')
      context.yarn = !!res
    } catch (error) {
      context.yarn = false
    }
  }
}

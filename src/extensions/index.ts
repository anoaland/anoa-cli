import extensions, { RootContext } from '../libs'

export default (context: RootContext) => {
  for (const key of Object.keys(extensions)) {
    context[key] = function() {
      return (extensions[key](context) as Function).apply(this, arguments)
    }
  }
}

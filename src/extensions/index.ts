import { extensions, RootContext } from '../libs'

/**
 * Initialize all extensions
 */
export default (context: RootContext) => {
  for (const key of Object.keys(extensions)) {
    const ext = extensions[key](context)
    if (typeof ext === 'function') {
      context[key] = function() {
        return (ext as () => void).apply(this, arguments)
      }
    } else {
      context[key] = ext
    }
  }
}

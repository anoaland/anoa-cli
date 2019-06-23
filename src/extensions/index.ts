import * as extensions from '../core/extensions';

export type Extensions = typeof extensions

/**
 * Initialize all extensions
 */
export default context => {
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

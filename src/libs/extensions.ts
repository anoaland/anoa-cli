import { RootContext } from '.'

/**
 * Get project configuration
 * @param _context root context
 */
export function config(_context: RootContext) {
  return {
    folders: {
      source: 'src',
      components: 'views/components',
      screens: 'views/screens',
      assets: 'assets'
    }
  }
}

/**
 * Get folder path
 * @param param0 root context
 */
export function folder({ config: { folders } }: RootContext) {
  return {
    src: (path: string) => {
      return `${folders.source}/${path}`
    },
    components: (path: string) => {
      return `${folders.source}/${folders.components}/${path}`
    },
    screens: (path: string) => {
      return `${folders.source}/${folders.screens}/${path}`
    },
    assets: (path: string) => {
      return `${folders.assets}/${path}`
    }
  }
}

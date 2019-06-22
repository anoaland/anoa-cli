import * as path from 'path'
import { RootContext } from '../context'

/**
 * Get folder path
 * @param context root context
 */
export function folder(context: RootContext) {
  return {
    src: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(folders.source, pathOrFilename)
    },
    components: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.views,
        folders.components,
        pathOrFilename
      )
    },
    screens: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.views,
        folders.screens,
        pathOrFilename
      )
    },
    navigator: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.views,
        folders.navigators,
        pathOrFilename
      )
    },
    assets: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(folders.assets, pathOrFilename)
    },
    store: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(folders.source, folders.store, pathOrFilename)
    },
    reducers: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.store,
        folders.reducers,
        pathOrFilename
      )
    },
    thunks: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.store,
        folders.thunks,
        pathOrFilename
      )
    },
    styles: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.views,
        folders.styles,
        pathOrFilename
      )
    },
    themes: (pathOrFilename: string = '') => {
      const {
        settings: { folders }
      } = context
      return path.join(
        folders.source,
        folders.views,
        folders.styles,
        'themes',
        pathOrFilename
      )
    }
  }
}

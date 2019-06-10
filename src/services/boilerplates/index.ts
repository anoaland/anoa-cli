import { RootContext } from '../../libs'
import { Utils } from '../core/utils'
import { ExpoBoilerplate } from './expo'
import { ReactNativeInitBoilerplate } from './react-native-init'

export enum ProjectTypes {
  EXPO = 'expo',
  REACT_NATIVE_INIT = 'react-native-init'
}

export class Boilerplate {
  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Initialize / generate new boilerplate
   * @param type project type
   * @param dir target directory
   */
  async init(type: ProjectTypes, dir: string) {
    switch (type) {
      case ProjectTypes.EXPO:
        await new ExpoBoilerplate(this.context).init(dir)
        break

      case ProjectTypes.REACT_NATIVE_INIT:
        await new ReactNativeInitBoilerplate(this.context).init(dir)
        break

      default:
        this.utils.exit('Invalid project type.')
    }
  }
}

import { CliTools } from '../tools/cli'
import { NpmTools } from '../tools/npm'
import { ProjectTools } from '../tools/project'
import { ReactTools } from '../tools/react'
import { ReduxTools } from '../tools/redux'
import { SourceTools } from '../tools/source'
import { TsTools } from '../tools/ts'
import { Utils } from '../tools/utils'
import { ValidateTools } from '../tools/validate'
import { RootContext } from '../types'

const cachedTools: { [key: string]: any } = {}

export function tools(context: RootContext) {
  return {
    cli: () =>
      (cachedTools.cli ||
        (cachedTools.cli = new (require('../tools/cli')).CliTools(
          context
        ))) as CliTools,
    project: () =>
      (cachedTools.project ||
        (cachedTools.project = new (require('../tools/project')).ProjectTools(
          context
        ))) as ProjectTools,
    npm: () =>
      (cachedTools.npm ||
        (cachedTools.npm = new (require('../tools/npm')).NpmTools(
          context
        ))) as NpmTools,
    source: () =>
      (cachedTools.source ||
        (cachedTools.source = new (require('../tools/source')).SourceTools(
          context
        ))) as SourceTools,
    ts: () =>
      (cachedTools.ts ||
        (cachedTools.ts = new (require('../tools/ts')).TsTools(
          context
        ))) as TsTools,
    react: () =>
      (cachedTools.react ||
        (cachedTools.react = new (require('../tools/react')).ReactTools(
          context
        ))) as ReactTools,
    utils: () =>
      (cachedTools.utils ||
        (cachedTools.utils = new (require('../tools/utils')).Utils(
          context
        ))) as Utils,
    validate: () =>
      (cachedTools.validate ||
        (cachedTools.validate = new (require('../tools/validate')).ValidateTools(
          context
        ))) as ValidateTools,
    redux: () =>
      (cachedTools.redux ||
        (cachedTools.redux = new (require('../tools/redux')).ReduxTools(
          context
        ))) as ReduxTools
  }
}

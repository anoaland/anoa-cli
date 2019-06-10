import * as path from 'path'
import { RootContext } from '../../../../libs'
import { Utils } from '../../../core'
import { BrowseViewInfo, ProjectBrowser } from '../../../core/project-browser'
import { NavigatorTypeEnum } from './nav-types'

export class CreateNavigatorBuilderQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  utils: Utils
  result: CreateNavigatorBuilderQAResult

  constructor(context: RootContext) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.utils = new Utils(context)
  }

  async run() {
    const {
      prompt,
      naming,
      filesystem: { exists },
      print: { colors },
      folder,
      strings: { kebabCase }
    } = this.context

    const attachToScreen = await this.utils.confirm(
      'Attach this navigator to particular screen?'
    )

    let screenToAttach: BrowseViewInfo
    let navigatorName: string
    if (attachToScreen) {
      screenToAttach = (await this.projectBrowser.browseScreens()) as BrowseViewInfo
      navigatorName = screenToAttach.info.name
      const navPath = path.join(
        path.dirname(screenToAttach.sourceFile.getFilePath()),
        'nav.ts'
      )
      if (exists(navPath)) {
        this.utils.exit(
          `Aborted. The ${colors.yellow(
            screenToAttach.info.name
          )} is already attached to navigator.`
        )
        return
      }
    } else {
      ;({ navigatorName } = await prompt.ask({
        type: 'input',
        message: 'Enter navigator name',
        name: 'navigatorName',
        validate(val) {
          if (!val) {
            return 'Navigator name is required'
          }

          const navPath =
            folder.navigator(kebabCase(naming.navigator(val))) + '.ts'
          if (exists(navPath)) {
            return `Please try different name since file ${colors.yellow(
              navPath
            )} is already exists.`
          }
          return true
        }
      }))
    }
    navigatorName = naming.navigator(navigatorName)

    // navigator type prompt
    const choices = Object.keys(NavigatorTypeEnum).map(
      k => NavigatorTypeEnum[k]
    )
    const { selectedType } = await prompt.ask([
      {
        name: 'selectedType',
        message: 'Select the type of navigator you would like to use',
        type: 'list',
        choices
      }
    ])

    // routes prompt
    const routes = await this.buildRoutes()
    const routeChoices = routes.reduce((acc, cur) => {
      acc[cur.screen.key.trim()] = cur
      return acc
    }, {})
    const { selectedInitialRoute } = await prompt.ask([
      {
        name: 'selectedInitialRoute',
        message: 'Select the initial route',
        type: 'list',
        choices: Object.keys(routeChoices),
        format(val) {
          if (val) {
            return val.replace(/\s\s/g, '')
          }
        }
      }
    ])

    const initialRoute: RouteViewInfo = routeChoices[selectedInitialRoute]

    this.result = {
      name: navigatorName,
      type: selectedType as NavigatorTypeEnum,
      screenToAttach,
      routes,
      initialRoute
    }
  }

  async buildRoutes(): Promise<RouteViewInfo[]> {
    const {
      prompt,
      strings: { snakeCase, padEnd, upperFirst },
      print: { colors }
    } = this.context

    const screens: BrowseViewInfo[] = (await this.projectBrowser.browseScreens(
      true,
      'Select screens to routes'
    )) as BrowseViewInfo[]

    const fields = screens.map(s => {
      const routeName = snakeCase(s.info.name)
        .replace(/screen$/, '')
        .split('_')
        .map(s1 => upperFirst(s1))

      return {
        routeName: routeName.join('').trim(),
        screen: s,
        name: snakeCase(s.key),
        message: s.key.replace(/\s\s/g, ''),
        initial: routeName.join(' ').trim()
      }
    })

    const template = fields
      .map(
        s => ` · ${padEnd(s.message, 30, ' ')}: ${colors.cyan(`\${${s.name}}`)}`
      )
      .join('\r\n')

    const { titles } = await prompt.ask({
      name: 'titles',
      type: 'snippet',
      message: 'Define route titles',
      // @ts-ignore
      template,
      fields
    })

    return fields.map<RouteViewInfo>(s => ({
      screen: s.screen,
      title: titles.values[s.name],
      routeName: s.routeName
    }))
  }
}

export interface CreateNavigatorBuilderQAResult {
  name: string
  type: NavigatorTypeEnum
  screenToAttach?: BrowseViewInfo
  routes: RouteViewInfo[]
  initialRoute: RouteViewInfo
}

export interface RouteViewInfo {
  screen: BrowseViewInfo
  title: string
  routeName: string
}

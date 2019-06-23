import * as path from 'path'
import { ReactView } from '../../core/libs/react-view'
import {
  CreateNavigatorArgs,
  NavigatorTypeEnum,
  RootContext,
  RouteViewInfo,
  ViewKindEnum
} from '../../core/types'

export class CreateNavigatorServiceQA {
  context: RootContext
  result: CreateNavigatorArgs

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<CreateNavigatorArgs> {
    const {
      prompt,
      naming,
      filesystem: { exists },
      print: { colors },
      folder,
      strings: { kebabCase },
      tools
    } = this.context

    const cli = tools.cli()
    const utils = tools.utils()

    const attachToScreen = await cli.confirm(
      'Attach this navigator to particular screen?'
    )

    let screenToAttach: ReactView
    let navigatorName: string
    if (attachToScreen) {
      screenToAttach = (await cli.browseViews(ViewKindEnum.screen)) as ReactView
      navigatorName = screenToAttach.name
      const navPath = path.join(
        path.dirname(screenToAttach.sourceFile.getFilePath()),
        'nav.ts'
      )

      if (exists(navPath)) {
        utils.exit(
          `Aborted. The ${colors.yellow(
            navigatorName
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

    return {
      name: navigatorName,
      type: selectedType as NavigatorTypeEnum,
      screenToAttach,
      routes,
      initialRoute
    }
  }

  private async buildRoutes(): Promise<RouteViewInfo[]> {
    const {
      prompt,
      strings: { snakeCase, padEnd, upperFirst },
      print: { colors },
      tools
    } = this.context

    const screens: ReactView[] = (await tools
      .cli()
      .browseViews(
        ViewKindEnum.screen,
        true,
        'Select screens to routes'
      )) as ReactView[]

    const fields = screens.map(s => {
      const routeName = snakeCase(s.name)
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

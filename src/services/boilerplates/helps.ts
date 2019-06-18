import { print } from 'gluegun'

const { colors } = print

export const helps = {
  Usage: {
    'anoa (i, init) [project directory] [options]': ''
  },
  Options: {
    '--expo, --react-native-init': `Use ${colors.cyan(
      'expo'
    )} for Expo project, or ${colors.cyan(
      'react-native-init'
    )} React Native Init project`,
    '--name (project name)': 'Set the project name (expo only)',
    '--slug (project slug)': 'Set the project slug (expo only)',
    '--yarn': 'Force use yarn if found installed (expo only)'
  }
}

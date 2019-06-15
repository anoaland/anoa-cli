// --------------------------------------------------------- //
// Please do not edit this file. This file is autogenerated. //
// --------------------------------------------------------- //

import { ThemeContext, ThemeContextProps } from 'anoa-react-native-theme'
import { BaseTheme } from './themes/base'
import { SecondaryTheme } from './themes/secondary-theme'

const themes = {
  secondary: SecondaryTheme
}

export const AppStyle = new ThemeContext(BaseTheme, themes)
export type AppThemes = typeof themes
export type AppStyleProps = ThemeContextProps<typeof BaseTheme, AppThemes>
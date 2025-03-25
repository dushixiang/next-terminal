import {useAtom} from "jotai"
import XtermThemes, {XtermTheme} from "@/src/color-theme/XtermThemes";
import {atomWithLocalStorage} from "@/src/hook/atom";

type ConfigTerminalTheme = {
    selected: string | null,
    theme?: XtermTheme
    fontSize: number,
    fontFamily: string,
    lineHeight: number,
}

const defaultTheme = `Apple System Colors`

export const DefaultTerminalTheme = {
    selected: defaultTheme,
    theme: XtermThemes.filter(item => item.name === defaultTheme)[0],
    fontSize: 14,
    fontFamily: 'monaco, Consolas, "Lucida Console", monospace',
    lineHeight: 1.0,
}

const configAtom = atomWithLocalStorage<ConfigTerminalTheme>('access-theme', DefaultTerminalTheme)

export function useTerminalTheme() {
    return useAtom(configAtom)
}

export function CleanTheme(theme: ConfigTerminalTheme) {
    if (!theme.fontSize || theme.fontSize == 0) {
        theme.fontSize = DefaultTerminalTheme.fontSize
    }
    if (!theme.fontFamily) {
        theme.fontFamily = DefaultTerminalTheme.fontFamily
    }
    if (!theme.selected) {
        theme.selected = DefaultTerminalTheme.selected
        theme.theme = DefaultTerminalTheme.theme
    }
    if (!theme.lineHeight || theme.lineHeight == 0) {
        theme.lineHeight = DefaultTerminalTheme.lineHeight
    }
    return theme
}
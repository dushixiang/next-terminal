import {atomWithLocalStorage} from "@/src/hook/atom";
import {useAtom} from "jotai/index";
import type {MapToken, SeedToken} from "antd/es/theme/interface";
import {theme} from "antd";

type ConfigTheme = {
    isDark: boolean
    algorithm: (token: SeedToken) => MapToken,
    backgroundColor?: string,
    wrapBackgroundColor?: string,
}

export const DefaultTheme: ConfigTheme = {
    isDark: false,
    algorithm: theme.defaultAlgorithm,
    backgroundColor: '#fff',
    wrapBackgroundColor: '#fff',
}

export const DarkTheme: ConfigTheme = {
    isDark: true,
    algorithm: theme.darkAlgorithm,
    backgroundColor: '#09090B',
    wrapBackgroundColor: '#1D1D1D',
}

const configAtom = atomWithLocalStorage<ConfigTheme>('nt-theme', DefaultTheme);

export function useNTTheme() {
    return useAtom(configAtom)
}
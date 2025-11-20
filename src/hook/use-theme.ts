import {atomWithLocalStorage} from "@/hook/atom";
import {useAtom} from "jotai/index";
import type {MapToken, SeedToken} from "antd/es/theme/interface";
import {theme} from "antd";

type ConfigTheme = {
    isDark: boolean
    algorithm: (token: SeedToken) => MapToken,
    backgroundColor?: string,
}

export const DefaultTheme: ConfigTheme = {
    isDark: false,
    algorithm: theme.defaultAlgorithm,
    backgroundColor: '#fff',
}

export const DarkTheme: ConfigTheme = {
    isDark: true,
    algorithm: theme.darkAlgorithm,
    backgroundColor: '#09090B',
    // backgroundColor: '#101217',
}

const configAtom = atomWithLocalStorage<ConfigTheme>('nt-theme', DefaultTheme);

export function useNTTheme() {
    return useAtom(configAtom)
}
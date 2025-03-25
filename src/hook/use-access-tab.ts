import {atom, useAtom} from "jotai"


const configAtom = atom<string>('')

export function useAccessTab() {
    return useAtom(configAtom)
}
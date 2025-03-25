import {atom, useAtom} from "jotai/index";

const configAtom = atom<number>(0)

export function useAccessContentSize() {
    return useAtom(configAtom)
}
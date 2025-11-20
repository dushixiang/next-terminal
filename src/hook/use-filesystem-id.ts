import {atomWithLocalStorage} from "@/hook/atom";
import {useAtom} from "jotai/index";

const configAtom = atomWithLocalStorage<string>('filesystem-id', '');

export function useFilesystemId() {
    return useAtom(configAtom);
}
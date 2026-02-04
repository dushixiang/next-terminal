import {atom, useAtom} from 'jotai';

const accessContentSizeAtom = atom<number>(0);

export function useAccessContentSize() {
    return useAtom(accessContentSizeAtom);
}

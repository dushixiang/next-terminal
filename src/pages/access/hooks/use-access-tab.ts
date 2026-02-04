import {atom, useAtom} from 'jotai';

const accessTabAtom = atom<string>('');

export function useAccessTab() {
    return useAtom(accessTabAtom);
}

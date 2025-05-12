import {atom} from "jotai/index";
import {SimpleLicense} from "@/src/api/license-api";

export const atomWithLocalStorage = <T>(key: string, initialValue: T) => {
    const getInitialValue = () => {
        const item = localStorage.getItem(key);
        if (item !== null) {
            return JSON.parse(item) as T;
        }
        return initialValue;
    };

    const baseAtom = atom(getInitialValue());

    return atom(
        (get) => get(baseAtom),
        (get, set, update: T | ((prev: T) => T)) => {
            const nextValue = typeof update === 'function' ? (update as (prev: T) => T)(get(baseAtom)) : update;
            set(baseAtom, nextValue);
            localStorage.setItem(key, JSON.stringify(nextValue));
        },
    );
};

export const atomLicenseWithLocalStorage = <T>(key: string, initialValue: T) => {
    const getInitialValue = () => {
        const item = localStorage.getItem(key);
        if (item !== null) {
            const parsed = JSON.parse(item);
            // 如果 T 是 License 类型，手动转换为 License 实例
            if (initialValue instanceof SimpleLicense) {
                return new SimpleLicense(parsed.type, parsed.expired, parsed.oem) as T;
            }
            return parsed as T;
        }
        return initialValue;
    };

    const baseAtom = atom(getInitialValue());

    return atom(
        (get) => get(baseAtom),
        (get, set, update: T | ((prev: T) => T)) => {
            const nextValue = typeof update === 'function' ? (update as (prev: T) => T)(get(baseAtom)) : update;
            set(baseAtom, nextValue);
            localStorage.setItem(key, JSON.stringify(nextValue));
        },
    );
};
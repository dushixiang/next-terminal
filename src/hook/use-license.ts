import {atomLicenseWithLocalStorage} from "@/src/hook/atom";
import {useAtom} from "jotai/index";
import {SimpleLicense} from "@/src/api/license-api";

// 创建初始 License 实例
const initialLicense = new SimpleLicense('');

const configAtom = atomLicenseWithLocalStorage<SimpleLicense>('nt-license', initialLicense);

export function useLicense() {
    return useAtom(configAtom)
}
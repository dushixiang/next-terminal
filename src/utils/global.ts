import {AccountInfo} from "@/src/api/account-api";
import {Branding} from "@/src/api/branding-api";

export type Global = {
    user: AccountInfo;
    branding?: Branding
}

export const global = window as any as Global;
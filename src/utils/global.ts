import {AccountInfo} from "@/api/account-api";
import {Branding} from "@/api/branding-api";

export type Global = {
    user: AccountInfo;
    branding?: Branding
}

export const global = window as any as Global;
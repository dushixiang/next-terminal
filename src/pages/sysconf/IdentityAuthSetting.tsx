import {Tabs} from "antd";
import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {maybe} from "@/utils/maybe.ts";
import SecuritySMSSetting from "./SecuritySMSSetting";
import WebAuthnSetting from "@/pages/sysconf/WebAuthnSetting";
import LdapSetting from "@/pages/sysconf/LdapSetting";
import WechatWorkSetting from "@/pages/sysconf/WechatWorkSetting";
import OidcSetting from "@/pages/sysconf/OidcSetting";
import {SettingProps} from "./SettingPage";

const IdentityAuthSetting = ({
                                 get,
                                 set
                             }: SettingProps) => {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeKey, setActiveKey] = useState(maybe(searchParams.get('identityActiveKey'), searchParams.get('securityActiveKey') === 'sms-login' ? 'sms-login' : 'webauthn'));

    const handleTabChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': 'identity-auth', 'identityActiveKey': key});
    };

    return <Tabs
        activeKey={activeKey}
        onChange={handleTabChange}
        items={[
            {
                label: t('settings.webauthn.setting'),
                key: 'webauthn',
                children: <WebAuthnSetting get={get} set={set}/>
            },
            {
                label: t('settings.ldap.setting'),
                key: 'ldap',
                children: <LdapSetting get={get} set={set}/>
            },
            {
                label: t('settings.wechat_work.setting'),
                key: 'wechat-work',
                children: <WechatWorkSetting get={get} set={set}/>
            },
            {
                label: t('settings.oidc.setting'),
                key: 'oidc',
                children: <OidcSetting get={get} set={set}/>
            },
            {label: t("settings.sms_policy.login"), key: "sms-login", children: <SecuritySMSSetting get={get} set={set} scope="login"/>},
        ]}
    />;
};

export default IdentityAuthSetting;

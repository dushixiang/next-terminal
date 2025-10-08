import {Tabs, TabsProps} from 'antd';
import React from 'react';
import {SettingProps} from "@/src/pages/sysconf/SettingPage";
import LdapSetting from "@/src/pages/sysconf/LdapSetting";
import {useTranslation} from "react-i18next";
import WebAuthnSetting from "@/src/pages/sysconf/WebAuthnSetting";
import WechatWorkSetting from "@/src/pages/sysconf/WechatWorkSetting";
import OidcSetting from "@/src/pages/sysconf/OidcSetting";

const IdentitySetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();

    const items: TabsProps['items'] = [
        {
            key: 'webauthn',
            label: t('settings.webauthn.setting'),
            children: <WebAuthnSetting get={get} set={set}/>,
        },
        {
            key: 'ldap',
            label: t('settings.ldap.setting'),
            children: <LdapSetting get={get} set={set}/>,
        },
        {
            key: 'wechat-work',
            label: t('settings.wechat_work.setting'),
            children: <WechatWorkSetting get={get} set={set}/>,
        },
        {
            key: 'oidc',
            label: t('settings.oidc.setting'),
            children: <OidcSetting get={get} set={set}/>,
        },
    ];

    return (
        <div>
            <Tabs items={items}/>
        </div>
    );
};

export default IdentitySetting;
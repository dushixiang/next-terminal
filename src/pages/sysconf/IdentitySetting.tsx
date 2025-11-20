import {Tabs, TabsProps} from 'antd';
import React from 'react';
import {SettingProps} from "@/pages/sysconf/SettingPage";
import LdapSetting from "@/pages/sysconf/LdapSetting";
import {useTranslation} from "react-i18next";
import WebAuthnSetting from "@/pages/sysconf/WebAuthnSetting";
import WechatWorkSetting from "@/pages/sysconf/WechatWorkSetting";
import OidcSetting from "@/pages/sysconf/OidcSetting";

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
import {Tabs, TabsProps} from 'antd';
import React from 'react';
import {SettingProps} from "@/src/pages/sysconf/SettingPage";
import LdapSetting from "@/src/pages/sysconf/LdapSetting";
import {useTranslation} from "react-i18next";
import WebAuthnSetting from "@/src/pages/sysconf/WebAuthnSetting";

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
    ];

    return (
        <div>
            <Tabs items={items}/>
        </div>
    );
};

export default IdentitySetting;
import {Tabs, TabsProps} from 'antd';
import React from 'react';
import {SettingProps} from "@/pages/sysconf/SettingPage";
import {useTranslation} from "react-i18next";
import OidcServerSetting from "@/pages/sysconf/OidcServerSetting";

const IdentitySourceSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();

    const items: TabsProps['items'] = [
        {
            key: 'oidc-server',
            label: 'OIDC Server',
            children: <OidcServerSetting get={get} set={set}/>,
        },
    ];

    return (
        <div>
            <Tabs items={items}/>
        </div>
    );
};

export default IdentitySourceSetting;

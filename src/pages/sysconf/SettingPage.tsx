import React, {useState} from 'react';
import {message, Tabs} from "antd";
import LicenseSetting from "./LicenseSetting";
import LogSetting from "./LogSetting";
import RdpSetting from "./RdpSetting";
import VncSetting from "./VncSetting";
import MailSetting from "./MailSetting";
import SecuritySetting from "./SecuritySetting";
import SshdSetting from "./SshdSetting";
import {useSearchParams} from "react-router-dom";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";
import {maybe} from "../../utils/maybe";
import ReverseProxySetting from "@/src/pages/sysconf/ReverseProxySetting";
import SystemSetting from "@/src/pages/sysconf/SystemSetting";
import About from "@/src/pages/sysconf/About";
import BackupSetting from "@/src/pages/sysconf/BackupSetting";
import LogoSetting from "@/src/pages/sysconf/LogoSetting";
import IdentitySetting from "@/src/pages/sysconf/IdentitySetting";

export interface SettingProps {
    get: () => any
    set: (values: any) => Promise<boolean | void>;
}

const SettingPage = () => {

    const [messageApi, contextHolder] = message.useMessage();
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), 'system-setting');

    let [activeKey, setActiveKey] = useState(key);
    let {t} = useTranslation();

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const set = async (values: any) => {
        await propertyApi.set(values);
        messageApi.success(t('general.success'));
    }

    const get = async () => {
        return await propertyApi.get();
    }

    const items = [
        {
            label: t('settings.system.setting'),
            key: 'system-setting',
            children: <SystemSetting get={get} set={set}/>
        },
        {
            label: t('settings.security.setting'),
            key: 'security-setting',
            children: <SecuritySetting get={get} set={set}/>
        },
        {
            label: t('settings.sshd.setting'),
            key: 'sshd',
            children: <SshdSetting get={get} set={set}/>
        },
        {
            label: t('settings.rp.setting'),
            key: 'reverse-proxy',
            children: <ReverseProxySetting get={get} set={set}/>
        },
        {
            label: t('settings.rdp.setting'),
            key: 'rdp',
            children: <RdpSetting get={get} set={set}/>
        },
        {
            label: t('settings.vnc.setting'),
            key: 'vnc',
            children: <VncSetting get={get} set={set}/>
        },
        {
            label: t('settings.mail.setting'),
            key: 'mail',
            children: <MailSetting get={get} set={set}/>
        },
        {
            label: t('settings.identity.setting'),
            key: 'ldap',
            children: <IdentitySetting get={get} set={set}/>
        },
        {
            label: t('settings.log.setting'),
            key: 'log',
            children: <LogSetting get={get} set={set}/>
        },
        {
            label: t('settings.backup.setting'),
            key: 'backup',
            children: <BackupSetting/>
        },
        {
            label: t('settings.license.setting'),
            key: 'license',
            children: <LicenseSetting/>
        },
        {
            label: t('settings.logo.setting'),
            key: 'logo',
            children: <LogoSetting/>
        },
        {
            label: t('settings.about.setting'),
            key: 'about',
            children: <About/>
        },
    ]

    return (
        <div className="px-4">
            <Tabs tabPosition={'left'} activeKey={activeKey} onChange={handleTagChange} tabBarStyle={{width: 150}}
                  items={items}>
            </Tabs>
            {contextHolder}
        </div>
    );
}

export default SettingPage;

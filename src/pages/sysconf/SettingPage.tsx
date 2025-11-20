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

import SystemSetting from "@/pages/sysconf/SystemSetting";
import About from "@/pages/sysconf/About";
import GeoIPSetting from "./GeoIPSetting";
import BackupSetting from "./BackupSetting";
import LogoSetting from "@/pages/sysconf/LogoSetting";
import IdentitySetting from "@/pages/sysconf/IdentitySetting";
import {useLicense} from "@/hook/use-license";
import NetworkSetting from "@/pages/sysconf/NetworkSetting";
import LLMSetting from "@/pages/sysconf/LLMSetting";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";

export interface SettingProps {
    get: () => any
    set: (values: any) => Promise<boolean | void>;
}

const SettingPage = () => {

    const { isMobile } = useMobile();
    const [messageApi, contextHolder] = message.useMessage();
    const [searchParams, setSearchParams] = useSearchParams();
    let [license] = useLicense();

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
            label: "网络设置",
            key: 'network',
            children: <NetworkSetting get={get} set={set}/>
        },
        {
            label: 'GeoIP 设置',
            key: 'geoip',
            children: <GeoIPSetting/>
        },
        {
            label: 'LLM 设置',
            key: 'llm',
            children: <LLMSetting get={get} set={set}/>
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

    ]

    if (!license.isOEM()) {
        items.push({
            label: t('settings.about.setting'),
            key: 'about',
            children: <About/>
        },)
    }

    return (
        <div className={cn('px-4', isMobile && 'px-2')}>
            <Tabs 
                tabPosition={isMobile ? 'top' : 'left'} 
                activeKey={activeKey} 
                onChange={handleTagChange} 
                tabBarStyle={isMobile ? {} : {width: 150}}
                items={items}
                size={isMobile ? 'small' : 'middle'}
                className={cn(
                    isMobile && 'mobile-setting-tabs'
                )}
            >
            </Tabs>
            {contextHolder}
        </div>
    );
}

export default SettingPage;

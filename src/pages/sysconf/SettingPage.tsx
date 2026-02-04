import React, {useState} from 'react';
import {message, Tabs} from "antd";
import LicenseSetting from "./LicenseSetting";
import LogSetting from "./LogSetting";
import RdpSetting from "./RdpSetting";
import VncSetting from "./VncSetting";
import MailSetting from "./MailSetting";
import SecuritySetting from "./SecuritySetting";
import SshdSetting from "./SshdSetting";
import DbProxySetting from "@/pages/sysconf/DbProxySetting";
import {useSearchParams} from "react-router-dom";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";
import {maybe} from "@/utils/maybe.ts";
import accountApi from "@/api/account-api";
import {useQuery} from "@tanstack/react-query";

import SystemSetting from "@/pages/sysconf/SystemSetting";
import About from "@/pages/sysconf/About";
import BackupSetting from "./BackupSetting";
import LogoSetting from "@/pages/sysconf/LogoSetting";
import IdentitySetting from "@/pages/sysconf/IdentitySetting";
import IdentitySourceSetting from "@/pages/sysconf/IdentitySourceSetting";
import {useLicense} from "@/hook/LicenseContext";
import NetworkSetting from "@/pages/sysconf/NetworkSetting";
import LLMSetting from "@/pages/sysconf/LLMSetting";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";

export interface SettingProps {
    get: () => any
    set: (values: any) => Promise<boolean | void>;
}

type PendingSet = {
    values: any;
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
};

const SettingPage = () => {

    const { isMobile } = useMobile();
    const [messageApi, contextHolder] = message.useMessage();
    const [searchParams, setSearchParams] = useSearchParams();
    let { license } = useLicense();

    let key = maybe(searchParams.get('activeKey'), 'system-setting');

    let [activeKey, setActiveKey] = useState(key);
    let {t} = useTranslation();
    let [mfaOpen, setMfaOpen] = useState(false);
    let [pendingSet, setPendingSet] = useState<PendingSet | null>(null);

    const infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    });

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const ensureMfaEnabled = async () => {
        if (infoQuery.data) {
            return infoQuery.data.mfaEnabled;
        }
        const res = await infoQuery.refetch();
        return res.data?.mfaEnabled ?? false;
    };

    const set = async (values: any) => {
        if (pendingSet) {
            return false;
        }
        const mfaEnabled = await ensureMfaEnabled();
        if (mfaEnabled) {
            return new Promise<boolean>((resolve, reject) => {
                setPendingSet({values, resolve, reject});
                setMfaOpen(true);
            });
        }
        await propertyApi.set(values);
        messageApi.success(t('general.success'));
        return true;
    }

    const handleMfaOk = async (securityToken: string) => {
        if (!pendingSet) {
            setMfaOpen(false);
            return;
        }
        const {values, resolve, reject} = pendingSet;
        try {
            await propertyApi.set(values, securityToken);
            messageApi.success(t('general.success'));
            resolve(true);
        } catch (err) {
            reject(err);
        } finally {
            setPendingSet(null);
            setMfaOpen(false);
        }
    };

    const handleMfaCancel = () => {
        if (pendingSet) {
            pendingSet.resolve(false);
        }
        setPendingSet(null);
        setMfaOpen(false);
    };

    const get = async () => {
        return await propertyApi.get();
    }

    const items = [
        {
            label: t('menus.setting.label'),
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
            label: t('db.proxy.setting'),
            key: 'db-proxy',
            children: <DbProxySetting get={get} set={set}/>
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
            label: t('settings.identity_methods'),
            key: 'ldap',
            children: <IdentitySetting get={get} set={set}/>
        },
        {
            label: t('settings.identity_source.setting'),
            key: 'identity-source',
            children: <IdentitySourceSetting get={get} set={set}/>
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
            label: t('settings.network.setting'),
            key: 'network',
            children: <NetworkSetting get={get} set={set}/>
        },
        {
            label: t('settings.llm.title'),
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
            <MultiFactorAuthentication
                open={mfaOpen}
                forceReauth
                handleOk={handleMfaOk}
                handleCancel={handleMfaCancel}
            />
        </div>
    );
}

export default SettingPage;

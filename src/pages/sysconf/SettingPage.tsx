import {useState} from 'react';
import {message, Tabs} from "antd";
import LogSetting from "./LogSetting";
import SecuritySetting from "./SecuritySetting";
import {useSearchParams} from "react-router-dom";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";
import VerificationServiceSetting from "./VerificationServiceSetting";
import accountApi from "@/api/account-api";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import SystemSetting from "@/pages/sysconf/SystemSetting";
import {useMobile} from "@/hook/use-mobile";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import ProxyServiceSetting from "@/pages/sysconf/ProxyServiceSetting";
import AssetAccessSetting from "@/pages/sysconf/AssetAccessSetting";
import IdentityAuthSetting from "@/pages/sysconf/IdentityAuthSetting";
import IdentityProviderServiceSetting from "@/pages/sysconf/IdentityProviderServiceSetting";
import NotificationIntegrationSetting from "@/pages/sysconf/NotificationIntegrationSetting";
import SystemMaintenanceSetting from "@/pages/sysconf/SystemMaintenanceSetting";
import AISetting from "@/pages/sysconf/AISetting";

export interface SettingProps {
    get: () => any
    set: (values: any) => Promise<boolean | void>;
}

type PendingSet = {
    values: any;
    resolve: (value: boolean) => void;
    reject: (reason?: any) => void;
};

type SetPropertiesPayload = {
    values: any;
    securityToken?: string;
};

const SettingPage = () => {

    const { isMobile } = useMobile();
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [searchParams, setSearchParams] = useSearchParams();

    const legacyService = searchParams.get('activeKey') === 'notification-integration' && ['mail', 'sms'].includes(searchParams.get('integrationActiveKey') || '');
    const legacySMSLogin = searchParams.get('activeKey') === 'security' && searchParams.get('securityActiveKey') === 'sms-login';
    const activeKey = legacySMSLogin ? 'identity-auth' : legacyService ? 'verification-services' : searchParams.get('activeKey') || 'system';
    let {t} = useTranslation();
    let [mfaOpen, setMfaOpen] = useState(false);
    let [pendingSet, setPendingSet] = useState<PendingSet | null>(null);

    const infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    });

    const setMutation = useMutation({
        mutationFn: ({values, securityToken}: SetPropertiesPayload) => propertyApi.set(values, securityToken),
        onSuccess: () => {
            messageApi.success(t('general.success'));
            queryClient.invalidateQueries({queryKey: ['info']});
            queryClient.invalidateQueries({queryKey: ['infoQuery']});
            queryClient.invalidateQueries({queryKey: ['form-request', 'api-key-access']});
        },
    });

    const handleTagChange = (key: string) => {
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
        if (pendingSet || setMutation.isPending) {
            return false;
        }
        const mfaEnabled = await ensureMfaEnabled();
        if (mfaEnabled) {
            return new Promise<boolean>((resolve, reject) => {
                setPendingSet({values, resolve, reject});
                setMfaOpen(true);
            });
        }
        await setMutation.mutateAsync({values});
        return true;
    }

    const handleMfaOk = async (securityToken: string) => {
        if (!pendingSet) {
            setMfaOpen(false);
            return;
        }
        const {values, resolve, reject} = pendingSet;
        try {
            await setMutation.mutateAsync({values, securityToken});
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
            label: t('settings.system.setting'),
            key: 'system',
            children: <SystemSetting get={get} set={set}/>
        },
        {
            label: t('settings.asset_access.setting'),
            key: 'asset-access',
            children: <AssetAccessSetting get={get} set={set}/>
        },
        {
            label: t('settings.proxy_service.setting'),
            key: 'proxy-service',
            children: <ProxyServiceSetting get={get} set={set}/>
        },
        {
            label: t('settings.security.setting'),
            key: 'security',
            children: <SecuritySetting get={get} set={set}/>
        },
        {
            label: t('settings.identity_auth.setting'),
            key: 'identity-auth',
            children: <IdentityAuthSetting get={get} set={set}/>
        },
        {
            label: t('settings.oidc_server.setting'),
            key: 'identity-provider-service',
            children: <IdentityProviderServiceSetting get={get} set={set}/>
        },
        {
            label: t('settings.verification_services.title'),
            key: 'verification-services',
            children: <VerificationServiceSetting get={get} set={set}/>
        },
        {
            label: t('settings.notification_integration.setting'),
            key: 'notification-integration',
            children: <NotificationIntegrationSetting/>
        },
        {
            label: t('settings.ai.setting'),
            key: 'ai',
            children: <AISetting get={get} set={set}/>
        },
        {
            label: t('settings.log_retention.setting'),
            key: 'log',
            children: <LogSetting get={get} set={set}/>
        },
        {
            label: t('settings.maintenance.setting'),
            key: 'maintenance',
            children: <SystemMaintenanceSetting/>
        },
    ]

    return (
        <div>
            <Tabs
                tabPlacement={isMobile ? 'top' : 'start'}
                activeKey={activeKey} 
                onChange={handleTagChange} 
                items={items}
                size={isMobile ? 'small' : 'middle'}
                className={isMobile ? 'setting-tabs mobile-setting-tabs' : 'setting-tabs'}
            />
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

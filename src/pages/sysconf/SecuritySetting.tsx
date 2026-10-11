import {Tabs} from "antd";
import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {maybe} from "@/utils/maybe.ts";
import SecurityLoginProtectionSetting from "@/pages/sysconf/SecurityLoginProtectionSetting";
import SecuritySessionPolicySetting from "@/pages/sysconf/SecuritySessionPolicySetting";
import SecurityPasswordPolicySetting from "@/pages/sysconf/SecurityPasswordPolicySetting";
import SecurityLoginLockSetting from "@/pages/sysconf/SecurityLoginLockSetting";
import SecuritySMSSetting from "./SecuritySMSSetting";
import SecurityAPIAccessSetting from "./SecurityAPIAccessSetting";
import {SettingProps} from "./SettingPage";

const SecuritySetting = ({
                             get,
                             set
                         }: SettingProps) => {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeKey, setActiveKey] = useState(maybe(searchParams.get('securityActiveKey'), 'login-protection'));

    const handleTabChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': 'security', 'securityActiveKey': key});
    };

    return <Tabs
        activeKey={activeKey}
        onChange={handleTabChange}
        items={[
            {
                label: t('settings.security.protection'),
                key: 'login-protection',
                children: <SecurityLoginProtectionSetting get={get} set={set}/>
            },
            {
                label: t('settings.security.session_management'),
                key: 'session-policy',
                children: <SecuritySessionPolicySetting get={get} set={set}/>
            },
            {
                label: t('settings.security.password.policy'),
                key: 'password-policy',
                children: <SecurityPasswordPolicySetting get={get} set={set}/>
            },
            {
                label: t('settings.security.login_lock.setting'),
                key: 'login-lock',
                children: <SecurityLoginLockSetting get={get} set={set}/>
            },
            {label: t("settings.email_mfa_policy.title"), key: "email-mfa", children: <SecuritySMSSetting get={get} set={set} scope="email-mfa"/>},
            {label: t("settings.sms_policy.mfa"), key: "sms-mfa", children: <SecuritySMSSetting get={get} set={set} scope="mfa"/>},
            {
                label: t('agent_access.api_setting'),
                key: 'api-access',
                children: <SecurityAPIAccessSetting get={get} set={set}/>
            },
        ]}
    />;
};

export default SecuritySetting;

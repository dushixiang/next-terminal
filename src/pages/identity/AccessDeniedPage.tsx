import accountApi from "@/api/account-api";
import {clearCurrentUser} from "@/utils/permission";
import {Button, Result, Space} from "antd";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useSearchParams} from "react-router-dom";

interface AccessDeniedDetail {
    scope: 'account';
    reason: 'ip' | 'time' | 'geo' | 'policy' | 'unknown';
}

const errorDetails: Record<number, AccessDeniedDetail> = {
    10010: {scope: 'account', reason: 'ip'},
    10011: {scope: 'account', reason: 'time'},
    10025: {scope: 'account', reason: 'geo'},
    10026: {scope: 'account', reason: 'policy'},
};

const safeReturnPath = (value: string | null) => {
    if (!value || /[\u0000-\u001F\u007F]/.test(value) || !value.startsWith('/') || value.startsWith('//') ||
        value.startsWith('/\\') || value.startsWith('/access-denied')) {
        return '/';
    }
    return value;
};

const AccessDeniedPage = () => {
    const {t} = useTranslation();
    const [searchParams] = useSearchParams();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const code = Number(searchParams.get('code'));
    const detail = errorDetails[code] ?? {scope: 'account', reason: 'unknown'};
    const returnPath = safeReturnPath(searchParams.get('from'));

    const logout = async () => {
        setLogoutLoading(true);
        try {
            await accountApi.logout();
        } finally {
            clearCurrentUser();
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            window.location.replace('/login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Result
                status="403"
                title={t(`access_control_denied.titles.${detail.scope}`)}
                subTitle={t(`access_control_denied.reasons.${detail.reason}`)}
                extra={
                    <Space wrap>
                        <Button type="primary" onClick={() => window.location.replace(returnPath)}>
                            {t('access_control_denied.retry')}
                        </Button>
                        <Button loading={logoutLoading} onClick={logout}>
                            {t('access_control_denied.logout')}
                        </Button>
                    </Space>
                }
            >
                <div className="text-center text-gray-500">
                    {t(`access_control_denied.hints.${detail.scope}`)}
                </div>
            </Result>
        </div>
    );
};

export default AccessDeniedPage;

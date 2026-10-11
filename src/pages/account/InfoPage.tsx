import {Layout, Tabs} from 'antd';
import NotificationPreferences from "./NotificationPreferences";
import ChangePassword from "./ChangePassword";
import OTP from "./OTP";
import {useTranslation} from "react-i18next";
import AccessToken from "@/pages/account/AccessToken";
import {Navigate, useLocation, useSearchParams} from "react-router-dom";
import {maybe} from "@/utils/maybe";
import ChangeInfo from "@/pages/account/ChangeInfo";
import {isMobileByMediaQuery} from "@/utils/utils";
import {cn} from "@/lib/utils";
import Passkey from "@/pages/account/Passkey";
import OidcServerAuthorizations from "@/pages/account/OidcServerAuthorizations";
import ClientCertificate from "@/pages/account/ClientCertificate";
import SSHKey from "@/pages/account/SSHKey";

const InfoPage = () => {

    let {t} = useTranslation();

    const [searchParams, setSearchParams] = useSearchParams();

    let activeKey = maybe(searchParams.get('activeKey'), "change-info");
    const handleTagChange = (key: string) => {
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('account.profile'),
            key: 'change-info',
            children: <ChangeInfo/>
        },
        {label: t('account.notifications.title'), key: 'notification-preferences', children: <NotificationPreferences/>},
        {
            label: t('account.change.password'),
            key: 'change-password',
            children: <ChangePassword/>
        },
        {
            label: t('identity.user.otp'),
            key: 'otp',
            children: <OTP/>
        },
        {
            label: t('account.passkey'),
            key: 'passkey',
            children: <Passkey/>
        },
        {
            label: t('account.ssh_key'),
            key: 'ssh-key',
            children: <SSHKey/>
        },
        {
            label: t('account.access_token'),
            key: 'access-token',
            children: <AccessToken/>
        },
        {
            label: t('account.client_cert'),
            key: 'client-cert',
            children: <ClientCertificate/>
        },
        {
            label: t('account.oidc_server_authorizations'),
            key: 'oidc-server-authorizations',
            children: <OidcServerAuthorizations/>
        },
    ];

    let isMobile = isMobileByMediaQuery();
    const location = useLocation();
    if (activeKey === 'agent-access') return <Navigate replace to={location.pathname === '/x-info' ? '/x-agent-access' : '/agent-access'}/>;

    return (
        <>
            <Layout.Content className={cn(
                'page-container',
                isMobile && 'px-4',
            )}>
                <Tabs tabPlacement={isMobile ? 'top' : 'start'}
                      className="min-w-0"
                      items={items}
                      activeKey={activeKey}
                      onChange={handleTagChange}
                >

                </Tabs>
            </Layout.Content>
        </>
    );
};

export default InfoPage;

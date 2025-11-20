import {Layout, Tabs} from 'antd';
import React from 'react';
import ChangePassword from "./ChangePassword";
import OTP from "./OTP";
import {useTranslation} from "react-i18next";
import AccessToken from "@/pages/account/AccessToken";
import {useSearchParams} from "react-router-dom";
import {maybe} from "@/utils/maybe";
import ChangeInfo from "@/pages/account/ChangeInfo";
import {isMobileByMediaQuery} from "@/utils/utils";
import {cn} from "@/lib/utils";
import Passkey from "@/pages/account/Passkey";

const InfoPage = () => {

    let {t} = useTranslation();

    const [searchParams, setSearchParams] = useSearchParams();

    let activeKey = maybe(searchParams.get('activeKey'), "change-info");
    const handleTagChange = (key: string) => {
        setSearchParams({'activeKey': key});
    }

    const items = [
        {
            label: t('account.change.info'),
            key: 'change-info',
            children: <ChangeInfo/>
        },
        {
            label: t('account.change.password'),
            key: 'change-password',
            children: <ChangePassword/>
        },
        {
            label: t('account.otp'),
            key: 'otp',
            children: <OTP/>
        },
        {
            label: t('account.passkey'),
            key: 'passkey',
            children: <Passkey/>
        },
        {
            label: t('account.access_token'),
            key: 'access-token',
            children: <AccessToken/>
        },
    ];

    let isMobile = isMobileByMediaQuery();

    return (
        <>
            <Layout.Content className={cn(
                'page-container',
                isMobile && 'px-4',
            )}>
                <Tabs tabPosition={isMobile ? 'top' : 'left'}
                    // tabBarStyle={{width: 150}}
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
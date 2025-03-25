import React, {useEffect, useState} from 'react';
import {Typography} from "antd";
import accountApi from "../../api/account-api";
import {useQuery} from "@tanstack/react-query";
import OTPBinding from "./OTPBinding";
import OTPUnBinding from "./OTPUnBinding";
import {useTranslation} from "react-i18next";

const OTP = () => {

    let {t} = useTranslation();
    let infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    })

    let [view, setView] = useState<string>('binding');

    useEffect(() => {
        if (infoQuery.data?.enabledTotp) {
            setView('unbinding');
        }else {
            setView('binding');
        }
    }, [infoQuery.data]);

    const refetch = () => {
        infoQuery.refetch();
    }

    const renderView = (view: string) => {
        switch (view) {
            case 'unbinding':
                return <OTPUnBinding refetch={refetch}/>;
            case 'binding':
                return <OTPBinding refetch={refetch}/>;
        }
    }

    return (
        <div>
            <Typography.Title level={5} style={{marginTop: 0}}>{t('account.otp')}</Typography.Title>
            {renderView(view)}
        </div>
    );
};

export default OTP;
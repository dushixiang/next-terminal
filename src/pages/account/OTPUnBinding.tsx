import React, {useState} from 'react';
import accountApi from "../../api/account-api";
import {App, Button, message, Result} from "antd";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";

export interface UnBinding2faProps {
    refetch: () => void
}

const OTPUnBinding = ({refetch}: UnBinding2faProps) => {

    let {t} = useTranslation();
    let [mfaOpen, setMfaOpen] = useState(false);
    let {modal} = App.useApp();

    return (
        <div>
            <Result
                status="success"
                title={t('account.otp_bind_title')}
                subTitle={t('account.otp_bind_sub_title')}
                extra={[
                    <Button type="primary" key="console" danger onClick={() => {
                        modal.confirm({
                            title: t('account.otp_unbind_title'),
                            icon: <ExclamationCircleOutlined/>,
                            content: t('account.otp_unbind_subtitle'),
                            okType: 'danger',
                            onOk: async () => {
                                setMfaOpen(true);
                            },
                        })
                    }}>
                        {t('account.otp_unbind')}
                    </Button>,
                ]}
            />

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    setMfaOpen(false);
                    await accountApi.resetTotp(securityToken);
                    message.success(t('general.success'));
                    refetch();
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </div>
    );
};

export default OTPUnBinding;
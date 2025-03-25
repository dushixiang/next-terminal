import React from 'react';
import accountApi from "../../api/account-api";
import {Button, message, Modal, Result} from "antd";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import {useTranslation} from "react-i18next";

export interface UnBinding2faProps {
    refetch: () => void
}

const OTPUnBinding = ({refetch}: UnBinding2faProps) => {
    let {t} = useTranslation();
    return (
        <div>
            <Result
                status="success"
                title={t('account.otp_bind_title')}
                subTitle={t('account.otp_bind_sub_title')}
                extra={[
                    <Button type="primary" key="console" danger onClick={() => {
                        Modal.confirm({
                            title: t('account.otp_unbind_title'),
                            icon: <ExclamationCircleOutlined/>,
                            content: t('account.otp_unbind_subtitle'),
                            okType: 'danger',
                            onOk: async () => {
                                let success = await accountApi.resetTotp();
                                if (success) {
                                    message.success(t('general.success'));
                                    refetch();
                                }
                            },
                        })
                    }}>
                        {t('account.otp_unbind')}
                    </Button>,
                ]}
            />
        </div>
    );
};

export default OTPUnBinding;
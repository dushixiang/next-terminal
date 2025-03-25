import React from 'react';
import {useQuery} from "@tanstack/react-query";
import accountApi from "../../api/account-api";
import {Alert, App, Button, Form, Input, message, QRCode, Space, Typography} from "antd";
import {useTranslation} from "react-i18next";

export interface Binding2faProps {
    refetch: () => void
}

const OTPBinding = ({refetch}: Binding2faProps) => {

    const [form] = Form.useForm();
    let {t} = useTranslation();
    let {message} = App.useApp();

    let totpQuery = useQuery({
        queryKey: ['totp'],
        queryFn: accountApi.reloadTotp,
        refetchOnWindowFocus: false,
    })

    const confirmTOTP = async (values: any) => {
        values['secret'] = totpQuery.data?.secret;
        await accountApi.confirmTotp(values);
        message.success(t('general.success'));
        refetch();
    }

    const renderQRCodeStatus = () => {
        if (totpQuery.isLoading) {
            return "loading";
        }
        // if(expired === true){
        //     return 'expired';
        // }
        return "active"
    }

    return (
        <div>
            <Space direction={'vertical'}>
                <QRCode value={totpQuery.data?.url as string} errorLevel={'M'} status={renderQRCodeStatus()}
                        onRefresh={() => totpQuery.refetch()}/>
                <Alert
                    message={totpQuery.data?.secret}
                    type="success"
                />
                <Form form={form} onFinish={confirmTOTP}>
                    <Form.Item
                        name="totp"
                        rules={[{required: true},]}
                    >
                        <Input placeholder="Please enter"/>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {t('account.submit')}
                        </Button>
                    </Form.Item>
                </Form>
            </Space>

        </div>
    );
};

export default OTPBinding;
import React, {useState} from 'react';
import {useQuery} from "@tanstack/react-query";
import accountApi from "../../api/account-api";
import {
    Alert, 
    App, 
    Button, 
    Form, 
    Input, 
    QRCode, 
    Typography, 
    Divider,
    Steps
} from "antd";
import {
    QrcodeOutlined,
    KeyOutlined,
    MobileOutlined,
    CopyOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone
} from '@ant-design/icons';
import {useTranslation} from "react-i18next";

const {Text, Paragraph} = Typography;

export interface Binding2faProps {
    refetch: () => void
}

const OTPBinding = ({refetch}: Binding2faProps) => {

    const [form] = Form.useForm();
    const [showSecret, setShowSecret] = useState(false);
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
        return "active"
    }

    const copySecret = () => {
        if (totpQuery.data?.secret) {
            navigator.clipboard.writeText(totpQuery.data.secret);
            message.success(t('general.copy_success'));
        }
    }

    const setupSteps = [
        {
            title: t('account.otp_setup_guide.step2.title'),
            description: t('account.otp_step2_description'),
            status: 'process' as const
        },
        {
            title: t('account.otp_setup_guide.step3.title'), 
            description: t('account.otp_step3_description'),
            status: 'wait' as const
        }
    ];

    return (
        <div>
            <Steps 
                items={setupSteps}
                size="small"
                style={{marginBottom: 24}}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <QrcodeOutlined />
                                <span>{t('account.otp_scan_qr')}</span>
                            </div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="flex flex-col items-center gap-4 w-full">
                                <QRCode 
                                    value={totpQuery.data?.url as string} 
                                    errorLevel={'M'} 
                                    status={renderQRCodeStatus()}
                                    onRefresh={() => totpQuery.refetch()}
                                    size={200}
                                />
                                <div className="w-full text-left">
                                    <Alert
                                        message={t('account.otp_scan_instruction')}
                                        type="info"
                                        showIcon
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <KeyOutlined />
                                <span>{t('account.otp_manual_setup')}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <Paragraph style={{marginBottom: 12}}>
                                {t('account.otp_manual_setup_desc')}
                            </Paragraph>
                            
                            <Input.Group compact>
                                <Input
                                    value={totpQuery.data?.secret}
                                    readOnly
                                    type={showSecret ? "text" : "password"}
                                    style={{width: 'calc(100% - 80px)'}}
                                />
                                <Button 
                                    icon={showSecret ? <EyeInvisibleOutlined /> : <EyeTwoTone />}
                                    onClick={() => setShowSecret(!showSecret)}
                                    style={{width: '40px'}}
                                />
                                <Button 
                                    icon={<CopyOutlined />}
                                    onClick={copySecret}
                                    style={{width: '40px'}}
                                    type="primary"
                                />
                            </Input.Group>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <MobileOutlined />
                                <span>{t('account.otp_verification_title')}</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="mb-4">
                                <Alert
                                    message={t('account.otp_verification_instruction')}
                                    type="warning"
                                    showIcon
                                />
                            </div>

                            <Form 
                                form={form} 
                                onFinish={confirmTOTP}
                                layout="vertical"
                            >
                                <Form.Item
                                    name="totp"
                                    label={t('account.otp_verification_code')}
                                    rules={[
                                        {required: true, message: '请输入验证码'},
                                        {pattern: /^\d{6}$/, message: '验证码必须是6位数字'}
                                    ]}
                                >
                                    <Input 
                                        placeholder={t('account.otp_verification_placeholder')}
                                        size="large"
                                        maxLength={6}
                                        style={{textAlign: 'center', fontSize: '18px', letterSpacing: '4px'}}
                                    />
                                </Form.Item>
                                
                                <Form.Item style={{marginBottom: 0}}>
                                    <Button 
                                        type="primary" 
                                        htmlType="submit" 
                                        size="large"
                                        block
                                        loading={false}
                                    >
                                        {t('account.submit')}
                                    </Button>
                                </Form.Item>
                            </Form>

                            <Divider />

                            <Alert
                                message={t('account.otp_security_tip')}
                                description={t('account.otp_security_description')}
                                type="success"
                                showIcon
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OTPBinding;
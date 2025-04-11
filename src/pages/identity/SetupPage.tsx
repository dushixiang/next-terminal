import React, {useRef, useState} from 'react';
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Alert, Button, Result, Typography} from "antd";
import {useQuery} from "@tanstack/react-query";
import brandingApi from "@/src/api/branding-api";
import userApi from "@/src/api/user-api";
import {ValidateStatus} from "antd/es/form/FormItem";
import {StyleProvider} from '@ant-design/cssinjs';
import strings from "@/src/utils/strings";

const {Title} = Typography;

const SetupPage = () => {

    let [ok, setOK] = useState<boolean>(false);
    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    let [newPassword1, setNewPassword1] = useState('');
    let [newPassword2, setNewPassword2] = useState('');
    let [newPasswordStatus, setNewPasswordStatus] = useState<ValidateStatus>();
    let [error, setError] = useState<string>('');

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();

    const get = async () => {
        return {
            type: 'admin',
            recording: 'enabled',
            watermark: 'enabled',
        };
    }

    const handleSubmit = async (values: any) => {
        userApi.setupUser(values)
            .then(() => {
                setOK(true);
            })
            .catch((result) => {
                alert(result?.message);
            });
    }

    const onNewPasswordChange = async (event: any) => {
        setNewPassword1(event.target.value);
        let {status, error} = validateNewPassword(event.target.value, newPassword2);
        setNewPasswordStatus(status);
        setError(error)
    }

    const onNewPassword2Change = (value: any) => {
        setNewPassword2(value.target.value);
        let {status, error} = validateNewPassword(newPassword1, value.target.value);
        setNewPasswordStatus(status);
        setError(error)
    }

    const validateNewPassword = (newPassword1: string, newPassword2: string) => {
        if (newPassword2 === newPassword1) {
            return {
                status: 'success' as ValidateStatus,
                error: '',
            };
        }
        return {
            status: 'error' as ValidateStatus,
            error: t('identity.setup.password_not_same'),
        };
    }

    return (
        <StyleProvider hashPriority="high">
            <div className="bg-gray-100 h-screen w-screen flex flex-col items-center justify-center">
                <div className={'bg-white rounded-lg shadow-md p-8 min-w-[480px]'}>
                    <div className={'flex flex-col items-center justify-center'}>
                        <Title level={2}>{brandingQuery.data?.name}</Title>
                        <div className={'font-medium mb-8'}>{t('identity.setup.user')}</div>
                    </div>

                    {ok ?
                        <div>
                            <Result
                                status="success"
                                title={t('identity.setup.success')}
                                extra={[
                                    <Button type="link" key="go-login" href="/login">
                                        {t('identity.setup.go_to_login')}
                                    </Button>,
                                ]}
                            />
                        </div>
                        :
                        <div>
                            {strings.hasText(error) &&
                                <div className={'mb-4'}>
                                    <Alert showIcon type="warning" message={error}/>
                                </div>
                            }
                            <ProForm formRef={formRef} request={get} onFinish={handleSubmit} submitter={{
                                submitButtonProps:{
                                    disabled: strings.hasText(error)
                                }
                            }}>
                                <ProFormText name={'username'} label={t('account.username')} rules={[{required: true}]}/>
                                <ProFormText.Password name={'password'}
                                                      label={t('account.password')}
                                                      rules={[{required: true}]}
                                                      fieldProps={{
                                                          onChange: onNewPasswordChange,
                                                      }}
                                />
                                <ProFormText.Password name={'newPassword2'}
                                                      label={t('account.confirm_password')}
                                                      rules={[{required: true}]}
                                                      validateStatus={newPasswordStatus}
                                                      fieldProps={{
                                                          onChange: onNewPassword2Change,
                                                      }}
                                />
                            </ProForm>
                        </div>
                    }

                </div>
            </div>
        </StyleProvider>
    );
};

export default SetupPage;
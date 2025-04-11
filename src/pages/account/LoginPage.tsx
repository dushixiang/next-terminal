import React, {useEffect, useState} from 'react';
import {Button, Divider, Form, Input, message, Spin, Typography} from "antd";
import {useNavigate, useSearchParams} from "react-router-dom";
import {LockOutlined, UserOutlined} from "@ant-design/icons";
import accountApi, {LoginResult, LoginStatus} from "../../api/account-api";
import {useMutation, useQuery} from "@tanstack/react-query";
import {setToken} from "../../api/core/requests";
import {StyleProvider} from '@ant-design/cssinjs';
import brandingApi from "@/src/api/branding-api";
import {useTranslation} from "react-i18next";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {REGEXP_ONLY_DIGITS} from "input-otp";
import {startAuthentication} from "@simplewebauthn/browser";

const {Title} = Typography;

// 定义状态枚举
export enum LoginStep {
    Default = "default",
    OTP = "otp",
}

const LoginPage = () => {
    const [optForm] = Form.useForm();
    let {t} = useTranslation();

    const [step, setStep] = useState<LoginStep>(LoginStep.Default);
    let [loading, setLoading] = useState<boolean>(false);

    const navigate = useNavigate();
    let [searchParams] = useSearchParams();

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    let queryCaptcha = useQuery({
        queryKey: ['getCaptcha'],
        queryFn: accountApi.getCaptcha,
    });

    let queryLoginStatus = useQuery({
        queryKey: ['login-status'],
        queryFn: accountApi.getLoginStatus,
    });

    useEffect(() => {
        if (queryLoginStatus.data) {
            switch (queryLoginStatus.data) {
                case LoginStatus.LoggedIn:
                    redirect();
                    break;
                case LoginStatus.OTPRequired:
                    setStep(LoginStep.OTP);
                    break;
                case LoginStatus.Unlogged:

                    break;
            }

        }
    }, [queryLoginStatus.data]);

    let mutation = useMutation({
        mutationFn: accountApi.login,
        onSuccess: data => {
            afterLoginSuccess(data, true);
        },
        onError: error => {
            queryCaptcha.refetch();
        }
    });

    const redirect = () => {
        let redirectUrl = searchParams.get('redirect');
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            navigate('/');
        }
    };

    let validateTOTP = useMutation({
        mutationFn: accountApi.validateTOTP,
        onSuccess: data => {
            redirect();
        }
    });

    const afterLoginSuccess = (data: LoginResult, loginByPassword: boolean) => {
        // 跳转登录
        sessionStorage.removeItem('current');
        sessionStorage.removeItem('openKeys');
        setToken(data.token);

        if (loginByPassword && data.needTotp) {
            setStep(LoginStep.OTP);
        } else {
            redirect();
        }
    }

    const handleSubmit = async (params: any) => {
        params['key'] = queryCaptcha.data?.key;
        mutation.mutate(params);
    };

    const handleOTPChange = (value) => {
        if (!validateTOTP.isPending) {
            validateTOTP.mutate({
                'totp': value,
            })
        }
    }

    const loginByPasskeyV2 = async () => {
        setLoading(true);
        try {
            let data = await accountApi.webauthnLoginStartV2();
            if (data.type === 'mfa') {
                return;
            }
            let authentication = await startAuthentication({
                optionsJSON: data.publicKey,
            });
            let data2 = await accountApi.webauthnLoginFinishV2(data.token, authentication);
            afterLoginSuccess(data2, false);
        } catch (e) {
            message.error(e.message);
        } finally {
            setLoading(false)
        }
    }

    const renderLoginForm = () => {
        switch (step) {
            case LoginStep.Default:
                return <div>
                    <Title level={3}>{t('account.login.action')}</Title>
                    <Form onFinish={handleSubmit} className="login-form" layout="vertical">
                        <Form.Item label={t('account.username')} name='username'
                                   rules={[{required: true}]}>
                            <Input size={'large'} prefix={<UserOutlined/>} placeholder={t('account.enter')}/>
                        </Form.Item>
                        <Form.Item label={t('account.password')}
                                   name='password'
                                   rules={[{required: true}]}>
                            <Input.Password size={'large'} prefix={<LockOutlined/>} placeholder={t('account.enter')}/>
                        </Form.Item>
                        {
                            queryCaptcha.data?.enabled ?
                                <Form.Item label={t('account.captcha')} name='captcha'
                                           rules={[{required: true}]}
                                >
                                    <Input prefix={<LockOutlined/>}
                                           size={'large'}
                                           addonAfter={
                                               <Spin spinning={queryCaptcha.isLoading}>
                                                   <div style={{width: 100}}>
                                                       <img
                                                           onClick={() => {
                                                               queryCaptcha.refetch();
                                                           }}
                                                           src={queryCaptcha.data?.captcha}
                                                           alt='captcha'
                                                           style={{cursor: 'pointer'}}
                                                       />
                                                   </div>
                                               </Spin>
                                           }
                                           placeholder={t(t('account.enter'))}/>
                                </Form.Item>
                                : undefined
                        }
                        <Form.Item>
                            <Button type="primary" htmlType="submit"
                                    size={'large'}
                                    className="w-full"
                                    loading={mutation.isPending}
                            >
                                {t('account.login.action')}
                            </Button>
                        </Form.Item>
                        <Divider className="my-4" plain>
                            Or
                        </Divider>
                        <Button variant={'filled'}
                                color={'default'}
                                size={'large'}
                                className="w-full"
                                onClick={loginByPasskeyV2}
                                loading={loading}
                        >
                            {t('account.login.methods.passkey')}
                        </Button>
                    </Form>
                </div>;
            case LoginStep.OTP:
                return <div>
                    <Title level={3}>{t('account.login.methods.otp')}</Title>

                    <Form form={optForm} onFinish={validateTOTP.mutate} className="login-form" layout="vertical">
                        <Form.Item label={t('account.otp')} name='totp'
                                   rules={[{required: true}]}>
                            <InputOTP maxLength={6}
                                      pattern={REGEXP_ONLY_DIGITS}
                                      onComplete={handleOTPChange}
                                      autoFocus={true}
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0}/>
                                    <InputOTPSlot index={1}/>
                                    <InputOTPSlot index={2}/>
                                    <InputOTPSlot index={3}/>
                                    <InputOTPSlot index={4}/>
                                    <InputOTPSlot index={5}/>
                                </InputOTPGroup>
                            </InputOTP>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary"
                                    htmlType="submit"
                                    size={'large'}
                                    className="w-full"
                                    loading={mutation.isPending}>
                                {t('account.login.action')}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
        }
    }

    return (
        <StyleProvider hashPriority="high">
            <div className={'h-screen w-screen relative flex items-center justify-center'}>
                <div className={'w-96 md:border rounded-lg p-8'}>
                    <div className={'font-medium mb-4 text-lg'}>{brandingQuery.data?.name}</div>
                    {renderLoginForm()}
                </div>

                <div className={'absolute bottom-12 text-blue-500'}>
                    <a href="https://beian.miit.gov.cn" rel="noopener" target="_blank">{brandingQuery.data?.icp}</a>
                </div>
            </div>
        </StyleProvider>

    );
}

export default LoginPage;

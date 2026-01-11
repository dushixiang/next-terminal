import React, {useEffect, useState} from 'react';
import {Button, Divider, Form, Input, Select, Space, Spin, Typography} from "antd";
import {useNavigate, useSearchParams} from "react-router-dom";
import {LockOutlined, UserOutlined} from "@ant-design/icons";
import accountApi, {LoginResult, LoginStatus} from "../../api/account-api";
import {useMutation, useQuery} from "@tanstack/react-query";
import {removeToken, setToken} from "@/api/core/requests.ts";
import {StyleProvider} from '@ant-design/cssinjs';
import brandingApi from "@/api/branding-api";
import {useTranslation} from "react-i18next";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {REGEXP_ONLY_DIGITS} from "input-otp";
import {startAuthentication} from "@simplewebauthn/browser";
import {LanguagesIcon} from "lucide-react";
import i18n from "i18next";
import wechatWorkApi from "@/api/wechat-work-api";
import oidcApi from "@/api/oidc-api";

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
            switch (queryLoginStatus.data?.status) {
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
        // 优先检查 return_url (OIDC Server 场景，重定向到第三方系统)
        let returnUrl = searchParams.get('return_url');
        if (returnUrl) {
            window.location.href = returnUrl;
            return;
        }

        // 其次检查 redirect (普通登录重定向)
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
                verifyBrowserAutofillInput: false,
            });
            let data2 = await accountApi.webauthnLoginFinishV2(data.token, authentication);
            afterLoginSuccess(data2, false);
        } finally {
            setLoading(false);
        }
    }

    const loginByWechatWork = async () => {
        setLoading(true);
        try {
            const {authorizeUrl} = await wechatWorkApi.getAuthorizeUrl('login');
            // 跳转到企业微信授权页面
            window.location.href = authorizeUrl;
        } catch (e) {
            console.error('WeChat Work login error:', e);
        } finally {
            setLoading(false);
        }
    }

    const loginByOidc = async () => {
        setLoading(true);
        try {
            const {authorizeUrl, state} = await oidcApi.getAuthorizeUrl();
            // 将 state 存储到 sessionStorage，用于回调时验证
            if (state) {
                sessionStorage.setItem('oidc_state', state);
            }
            // 跳转到 OIDC 授权页面
            window.location.href = authorizeUrl;
        } finally {
            setLoading(false);
        }
    }

    const renderLoginForm = () => {
        switch (step) {
            case LoginStep.Default:
                const loginStatus = queryLoginStatus.data;
                const showPassword = loginStatus?.passwordEnabled !== false;
                const showWebauthn = loginStatus?.webauthnEnabled;
                const showWechat = loginStatus?.wechatWorkEnabled;
                const showOidc = loginStatus?.oidcEnabled;
                const hasAlternatives = showWebauthn || showWechat || showOidc;

                return <div>
                    <Title level={3}>{t('account.login.action')}</Title>

                    {/* 密码登录表单 */}
                    {showPassword && (
                        <Form onFinish={handleSubmit} className="login-form" layout="vertical">
                            <Form.Item label={t('account.username')} name='username'
                                       rules={[{required: true}]}>
                                <Input size={'large'}
                                       prefix={<UserOutlined/>}
                                       placeholder={t('account.enter')}
                                       autoComplete={'username webauthn'}
                                />
                            </Form.Item>
                            <Form.Item label={t('account.password')}
                                       name='password'
                                       rules={[{required: true}]}>
                                <Input.Password size={'large'} prefix={<LockOutlined/>}
                                                placeholder={t('account.enter')}/>
                            </Form.Item>
                            {queryCaptcha.data?.enabled && (
                                <Form.Item label={t('account.captcha')} name='captcha'
                                           rules={[{required: true}]}>
                                    <Space.Compact>
                                        <Input prefix={<LockOutlined/>}
                                               size={'large'}
                                               placeholder={t('account.enter')}
                                        />
                                        <Spin spinning={queryCaptcha.isLoading}>
                                            <div style={{width: 100}}>
                                                <img
                                                    onClick={() => queryCaptcha.refetch()}
                                                    src={queryCaptcha.data?.captcha}
                                                    alt='captcha'
                                                    style={{cursor: 'pointer'}}
                                                />
                                            </div>
                                        </Spin>
                                    </Space.Compact>
                                </Form.Item>
                            )}
                            <Form.Item>
                                <Button type="primary" htmlType="submit"
                                        size={'large'}
                                        className="w-full"
                                        loading={mutation.isPending}
                                >
                                    {t('account.login.action')}
                                </Button>
                            </Form.Item>
                        </Form>
                    )}

                    {/* 分隔线 */}
                    {showPassword && hasAlternatives && (
                        <Divider className="my-4" plain>Or</Divider>
                    )}

                    {/* 其他登录方式 */}
                    {showWebauthn && (
                        <Button variant={'filled'}
                                color={'default'}
                                size={'large'}
                                className="w-full mb-2"
                                onClick={loginByPasskeyV2}
                                loading={loading}
                        >
                            {t('account.login.methods.passkey')}
                        </Button>
                    )}
                    {showWechat && (
                        <Button variant={'filled'}
                                color={'geekblue'}
                                size={'large'}
                                className="w-full mb-2"
                                onClick={loginByWechatWork}
                                loading={loading}
                        >
                            {t('account.login.methods.wechat_work')}
                        </Button>
                    )}
                    {showOidc && (
                        <Button variant={'filled'}
                                color={'primary'}
                                size={'large'}
                                className="w-full"
                                onClick={loginByOidc}
                                loading={loading}
                        >
                            {t('account.login.methods.oidc')}
                        </Button>
                    )}
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
                                      autoComplete={'one-time-code'}
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

                            <div className={'mt-2'}>
                                <div className={'text-blue-500 cursor-pointer'}
                                     onClick={() => {
                                         removeToken();
                                         setStep(LoginStep.Default);
                                     }}
                                >
                                    {t('account.login.back')}
                                </div>
                            </div>
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

                <div className={'absolute top-8 right-8 cursor-pointer'}>
                    <Select
                        placeholder="Language"
                        variant="borderless"
                        style={{
                            width: 120,
                        }}
                        prefix={<LanguagesIcon className={'w-4 h-4'}/>}
                        options={[
                            {value: 'en-US', label: 'English'},
                            {value: 'zh-CN', label: '简体中文'},
                            {value: 'zh-TW', label: '繁体中文'},
                            {value: 'ja-JP', label: '日本語'},
                        ]}
                        value={i18n.language}
                        onChange={(value) => {
                            i18n.changeLanguage(value);
                        }}
                    />
                </div>

                <div className={'absolute bottom-12 text-blue-500'}>
                    <a href="https://beian.miit.gov.cn" rel="noopener" target="_blank">{brandingQuery.data?.icp}</a>
                </div>
            </div>
        </StyleProvider>

    );
}

export default LoginPage;

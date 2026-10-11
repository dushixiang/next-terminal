import {getLocalizedErrorMessage} from '@/api/core/api-error';
import brandingApi from "@/api/branding-api";
import oidcApi from "@/api/oidc-api";
import wechatWorkApi from "@/api/wechat-work-api";
import { translateI18nToAntdLocale } from "@/helper/lang";
import { useNTTheme } from "@/hook/use-theme";
import { useThemeToggle } from "@/layout/hooks/use-theme-toggle";
import { StyleProvider } from '@ant-design/cssinjs';
import { LockOutlined,UserOutlined } from "@ant-design/icons";
import { startAuthentication } from "@simplewebauthn/browser";
import { useMutation,useQuery } from "@tanstack/react-query";
import { Alert,Button,ConfigProvider,Divider,Form,Input,Segmented,Select,Typography } from "antd";
import i18n from "i18next";
import { LanguagesIcon,Moon,Sun } from "lucide-react";
import { useEffect,useState } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate,useSearchParams } from "react-router-dom";
import accountApi,{ CaptchaProof,LoginAccount,LoginResult,LoginStatus } from "../../api/account-api";

import {passwordLoginRequest} from './login-request';
import SMSLoginForm from './SMSLoginForm';
import CaptchaChallenge from './CaptchaChallenge';

const {Title} = Typography;

// 定义状态枚举
enum LoginStep {
    Default = "default",
    OTP = "otp",
}

type LoginError = {
    code?: number;
    message?: string;
};

const LoginPage = () => {
    const [loginMode, setLoginMode] = useState('password');
    const [optForm] = Form.useForm();
    const [loginForm] = Form.useForm<LoginAccount & {verification?: CaptchaProof}>();
    const selectedSource = Form.useWatch('source', loginForm) ?? 'password';
    let {t} = useTranslation();
    const {isDarkMode, toggleDarkMode} = useThemeToggle();
    const [ntTheme] = useNTTheme();

    const [step, setStep] = useState<LoginStep>(LoginStep.Default);
    let [loading, setLoading] = useState<boolean>(false);

    const navigate = useNavigate();
    let [searchParams] = useSearchParams();

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    let queryLoginStatus = useQuery({
        queryKey: ['login-status'],
        queryFn: accountApi.getLoginStatus,
    });
    const source = queryLoginStatus.data?.ldapEnabled ? selectedSource : 'password';

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

    let mutation = useMutation<LoginResult, LoginError, LoginAccount>({
        mutationFn: accountApi.login,
        onSuccess: data => {
            afterLoginSuccess(data, true);
        },
        onError: _error => {
            loginForm.setFieldValue('verification', undefined);
        }
    });

    const isSafeRedirectUrl = (url: string): boolean => {
        // 先拒绝危险子集 /\evil.com /abc\nLocation://evil.com
        if (/[\u0000-\u001F\u007F]/.test(url) || url.startsWith('/\\')) {
            return false;
        }
        // 允许相对路径（以 / 开头，但不能是 // 开头的协议相对URL）
        if (url.startsWith('/') && !url.startsWith('//')) {
            return true;
        }
        // 仅允许同源 http/https URL，阻止 javascript:、data: 以及外部跳转
        try {
            const parsed = new URL(url, window.location.origin);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.origin === window.location.origin;
        } catch {
            return false;
        }
    };

    const redirect = () => {
        let returnUrl = searchParams.get('return_url');
        if (returnUrl && isSafeRedirectUrl(returnUrl)) {
            window.location.href = returnUrl;
        } else {
            navigate('/');
        }
    };

    let validateTOTP = useMutation({
        mutationFn: accountApi.validateTOTP,
        onSuccess: _data => {
            redirect();
        }
    });

    const afterLoginSuccess = (data: LoginResult, loginByPassword: boolean) => {
        // 跳转登录
        sessionStorage.removeItem('current');
        sessionStorage.removeItem('openKeys');

        if (loginByPassword && data.needTotp) {
            setStep(LoginStep.OTP);
        } else {
            redirect();
        }
    }

    const handleSubmit = ({verification, ...params}: LoginAccount & {verification?: CaptchaProof}) => {
        if (mutation.isPending) return;
        if (queryLoginStatus.data?.captchaEnabled && (!verification || verification.expiresAt <= Date.now())) {
            loginForm.setFieldValue('verification', undefined);
            loginForm.setFields([{name: 'verification', errors: [t('account.captcha_ui.required')]}]);
            return;
        }
        mutation.mutate(passwordLoginRequest(params, queryLoginStatus.data?.ldapEnabled === true, verification?.key));
    };

    const handleOTPChange = (value: string) => {
        if (!validateTOTP.isPending) {
            validateTOTP.mutate({
                'totp': value,
            })
        }
    }

    const handleBackToLogin = async () => {
        try {
            await accountApi.logout();
        } finally {
            optForm.resetFields();
            validateTOTP.reset();
            setStep(LoginStep.Default);
            queryLoginStatus.refetch();
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
            const {authorizeUrl, state} = await wechatWorkApi.getAuthorizeUrl();
            sessionStorage.setItem('wechat_work_state', state);
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
                const showSMS = loginStatus?.smsEnabled === true;
                const usingSMS = showSMS && (!showPassword || loginMode === 'sms');
                const showLdap = loginStatus?.ldapEnabled;
                const showWebauthn = loginStatus?.webauthnEnabled;
                const showWechat = loginStatus?.wechatWorkEnabled;
                const showOidc = loginStatus?.oidcEnabled;
                const hasAlternatives = showWebauthn || showWechat || showOidc;
                const loginError = mutation.error;
                const isLoginLocked = loginError?.code === 10007;

                return <div>
                    <Title level={3}>{t('account.login.action')}</Title>

                    {loginError && (
                        <div className="mb-4">
                            <Alert
                                type="error"
                                showIcon
                                title={isLoginLocked
                                    ? t('account.login.too_many_failures.title')
                                    : t('account.login.failed')}
                                description={isLoginLocked
                                    ? t('account.login.too_many_failures.description')
                                    : getLocalizedErrorMessage(loginError, t)}
                            />
                        </div>
                    )}

                    {showPassword && showSMS && <div className="mb-4"><Segmented block size="large" value={loginMode}
                        options={[{value: 'password', label: t('account.login.sms.password_login')}, {value: 'sms', label: t('account.login.sms.login')}]}
                        onChange={value => {setLoginMode(value); mutation.reset();}}/></div>}
                    {usingSMS && <SMSLoginForm onSuccess={data => afterLoginSuccess(data, true)}/>}
                    {/* 密码登录表单 */}
                    {showPassword && !usingSMS && (
                        <Form form={loginForm} initialValues={{source: 'password'}} onFinish={handleSubmit}
                              className="login-form" layout="vertical" disabled={mutation.isPending}>
                            {showLdap && <Form.Item name="source">
                                <Segmented block size="large" options={[
                                    {value: 'password', label: t('account.login.methods.local')},
                                    {value: 'ldap', label: t('account.login.methods.ldap')},
                                ]} onChange={() => {
                                    mutation.reset();
                                    loginForm.setFieldsValue({password: '', verification: undefined});
                                }}/>
                            </Form.Item>}
                            <Form.Item label={t('audit.operation.account')} name='username'
                                       rules={[{required: true, whitespace: true}]}>
                                <Input size={'large'}
                                       prefix={<UserOutlined/>}
                                       placeholder={t(source === 'ldap' ? 'account.login.ldap_username_hint' : 'account.enter')}
                                       autoComplete={source === 'ldap' ? 'username' : 'username webauthn'}
                                />
                            </Form.Item>
                            <Form.Item label={t('assets.password')}
                                       name='password'
                                       rules={[{required: true}]}>
                                <Input.Password size={'large'} prefix={<LockOutlined/>}
                                                placeholder={t('account.enter')}/>
                            </Form.Item>
                            {queryLoginStatus.data?.captchaEnabled && (
                                <Form.Item name="verification" rules={[{required: true, message: t('account.captcha_ui.required')}]}>
                                    <CaptchaChallenge disabled={mutation.isPending}/>
                                </Form.Item>
                            )}
                            <Form.Item>
                                <Button type="primary" htmlType="submit"
                                        size={'large'}
                                        className="w-full"
                                        loading={mutation.isPending}
                                        disabled={queryLoginStatus.isFetching || queryLoginStatus.isError}
                                >
                                    {t('account.login.action')}
                                </Button>
                            </Form.Item>
                        </Form>
                    )}

                    {/* 分隔线 */}
                    {(showPassword || showSMS) && hasAlternatives && (
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
                        <Form.Item label={t('identity.user.otp')} name='totp'
                                   required={true}>
                            <Input.OTP
                                size={'large'}
                                length={6}
                                autoFocus
                                onChange={(value) => {
                                    if (value.length === 6) {
                                        handleOTPChange(value);
                                    }
                                }}
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary"
                                    htmlType="submit"
                                    size={'large'}
                                    className="w-full"
                                    loading={validateTOTP.isPending}>
                                {t('account.login.action')}
                            </Button>

                            <div className={'mt-2'}>
                                <div className={'text-blue-500 cursor-pointer'}
                                     onClick={handleBackToLogin}
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
            <ConfigProvider
                theme={{
                    algorithm: ntTheme.algorithm,
                }}
                locale={translateI18nToAntdLocale(i18n.language)}
            >
                <div className={'h-screen w-screen relative flex items-center justify-center'}>
                    <div className={'w-96 md:border rounded-lg p-8'}>
                        <div className={'font-medium mb-4 text-lg text-foreground'}>{brandingQuery.data?.name}</div>
                        {renderLoginForm()}
                    </div>

                    <div className={'absolute top-8 right-8 flex items-center gap-2'}>
                        <button
                            type="button"
                            onClick={() => toggleDarkMode(!isDarkMode)}
                            className="h-8 w-8 rounded-md border border-slate-200/60 bg-white/80 text-slate-700 transition-colors hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
                            aria-label={t('general.toggle_theme')}
                        >
                            {isDarkMode ? <Sun className="h-4 w-4 mx-auto"/> : <Moon className="h-4 w-4 mx-auto"/>}
                        </button>
                        <Select
                            placeholder={t('general.language')}
                            variant="borderless"
                            style={{
                                width: 120,
                            }}
                            prefix={<LanguagesIcon className={'w-4 h-4'}/>}
                            options={[
                                {value: 'en-US', label: 'English'},
                                {value: 'zh-CN', label: t('general.language_zh_cn')},
                                {value: 'zh-TW', label: t('general.language_zh_tw')},
                                {value: 'ja-JP', label: t('general.language_ja_jp')},
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
            </ConfigProvider>
        </StyleProvider>

    );
}

export default LoginPage;

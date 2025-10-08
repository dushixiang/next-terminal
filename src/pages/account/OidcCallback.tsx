import React, {useEffect} from 'react';
import {Result, Spin} from 'antd';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useMutation} from '@tanstack/react-query';
import oidcApi from '@/src/api/oidc-api';
import {setToken} from '@/src/api/core/requests';
import {useTranslation} from 'react-i18next';

const OidcCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const {t} = useTranslation();

    const mutation = useMutation({
        mutationFn: ({code, state}: {code: string, state?: string}) => oidcApi.login(code, state),
        onSuccess: (data) => {
            // 设置令牌
            setToken(data.token);

            // 清除会话存储
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');

            // 登录成功，跳转到首页
            navigate('/');
        },
        onError: (error) => {
            console.error('OIDC login failed:', error);
            // 登录失败，跳转回登录页面
            navigate(`/login?error=${error.message}`);
        },
        retry: false,
    });

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code) {
            // 使用授权码进行登录
            mutation.mutate({code, state: state || undefined});
        } else {
            // 没有授权码，可能是用户拒绝授权或其他错误
            navigate('/login?error=oidc_cancelled');
        }
    }, []);

    if (mutation.isPending) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div className="text-center">
                    <Spin size="large"/>
                    <div className="mt-4 text-lg">
                        {t('account.login.processing')}
                    </div>
                </div>
            </div>
        );
    }

    if (mutation.isError) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <Result
                    status="error"
                    title={t('account.login.failed')}
                    subTitle={t('account.login.oidc_error')}
                    extra={[
                        <button
                            key="retry"
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                            onClick={() => navigate('/login')}
                        >
                            {t('account.login.back_to_login')}
                        </button>
                    ]}
                />
            </div>
        );
    }

    // 正常情况下，成功后会自动跳转，不会显示这个内容
    return null;
};

export default OidcCallback;
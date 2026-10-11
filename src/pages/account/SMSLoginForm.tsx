import {getLocalizedErrorMessage} from '@/api/core/api-error';
import {useRef, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Alert, Button, Form, Input, Space} from 'antd';
import type {InputRef} from 'antd';
import {useTranslation} from 'react-i18next';
import accountApi, {LoginResult, VerificationChallenge} from '@/api/account-api';
import CaptchaChallenge from './CaptchaChallenge';
import {useVerificationCountdown} from './use-verification-countdown';

type Fields = {phone: string; code: string};
const SMSLoginForm = ({onSuccess}: {onSuccess: (result: LoginResult) => void}) => {
    const {t} = useTranslation();
    const [form] = Form.useForm<Fields>();
    const phoneInput = useRef<InputRef>(null);
    const codeInput = useRef<InputRef>(null);
    const [captchaOpen, setCaptchaOpen] = useState(false);
    const [sendPhone, setSendPhone] = useState('');
    const [challenge, setChallenge] = useState<VerificationChallenge>();
    const [retryAt, setRetryAt] = useState(0);
    const countdown = useVerificationCountdown(retryAt);
    const send = useMutation({
        mutationFn: accountApi.sendSMSLoginCode,
        onSuccess: data => {
            setChallenge(data);
            setRetryAt(Date.now() + data.retryAfter * 1000);
            form.setFieldValue('code', '');
            setCaptchaOpen(false);
        },
    });
    const login = useMutation({mutationFn: accountApi.loginBySMS, onSuccess});
    const openCaptcha = async () => {
        if (countdown > 0 || send.isPending || login.isPending) return;
        try {
            const {phone} = await form.validateFields(['phone']);
            setSendPhone(phone.trim());
            send.reset();
            setCaptchaOpen(true);
        } catch { /* 字段错误由表单展示 */ }
    };
    return <>
        <Form form={form} layout="vertical" disabled={login.isPending || send.isPending}
            onValuesChange={changed => {
                if ('phone' in changed) {setChallenge(undefined); form.setFieldValue('code', '');}
                login.reset();
            }}
            onFinish={values => {
                if (challenge) login.mutate({phone: values.phone.trim(), code: values.code, challengeId: challenge.challengeId});
            }}>
            {send.error && <div className="mb-4"><Alert type="error" showIcon title={t('account.login.sms.send_failed')} description={getLocalizedErrorMessage(send.error, t)}/></div>}
            {login.error && <div className="mb-4"><Alert type="error" showIcon title={t('account.login.failed')} description={getLocalizedErrorMessage(login.error, t)}/></div>}
            <Form.Item name="phone" label={t('account.login.sms.phone')} rules={[{required: true, whitespace: true}, {
                    pattern: /^(\+[1-9][0-9]{6,14}|1[3-9][0-9]{9})$/,
                    transform: value => value?.trim(),
                    message: t('account.verification.phone_format'),
                }]}>
                <Input ref={phoneInput} size="large" inputMode="tel" autoComplete="tel" placeholder={t('account.login.sms.phone_placeholder')}/>
            </Form.Item>
            <Form.Item label={t('account.login.sms.code')} required>
                <Space.Compact className="w-full">
                    <Form.Item name="code" noStyle rules={[{required: true}, {pattern: /^\d{6}$/}]}>
                        <Input ref={codeInput} style={{minWidth: 0}} size="large" maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                            placeholder={t('account.login.sms.code_placeholder')}/>
                    </Form.Item>
                    <Button size="large" onClick={openCaptcha} disabled={countdown > 0} loading={send.isPending}>
                        {countdown > 0 ? t('account.login.sms.resend_after', {seconds: countdown})
                            : t(challenge ? 'account.login.sms.resend' : 'account.login.sms.send')}
                    </Button>
                </Space.Compact>
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={login.isPending} disabled={!challenge}>
                    {t('account.login.action')}
                </Button>
            </Form.Item>
        </Form>
        <CaptchaChallenge purpose="sms" open={captchaOpen} onOpenChange={setCaptchaOpen} showTrigger={false}
            disabled={send.isPending} onVerified={proof => send.mutate({phone: sendPhone, key: proof.key})}/>
    </>;
};
export default SMSLoginForm;

import {useEffect, useRef, useState} from 'react';
import {Alert, App, Button, Form, Input, Modal, Space} from 'antd';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import accountApi, {AccountInfo, DeliveryChannel, VerificationChallenge} from '@/api/account-api';
import MultiFactorAuthentication from './MultiFactorAuthentication';
import {useVerificationCountdown} from './use-verification-countdown';
import {getErrorMessage} from '@/api/core/api-error';

const ContactVerificationModal = ({channel, info, onClose}: {channel: DeliveryChannel; info: AccountInfo; onClose: () => void}) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<{value: string; password?: string}>();
    const [challenge, setChallenge] = useState<VerificationChallenge>();
    const [mfaOpen, setMfaOpen] = useState(false);
    const [pending, setPending] = useState<{value: string; password?: string}>();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [retryUntil, setRetryUntil] = useState(0);
    const retrySeconds = useVerificationCountdown(retryUntil);
    const mounted = useRef(true);
    useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
    const queryClient = useQueryClient();
    const purpose = channel === 'email' ? 'email-change' : 'phone-change';
    const showError = (e: unknown) => {
        const failure = e as {code?: number};
        const key = `errors.${failure.code}`;
        setError(failure.code && t(key) !== key ? t(key) : getErrorMessage(e));
    };
    const send = useMutation({
        mutationFn: ({values, securityToken}: {values: {value: string; password?: string}; securityToken?: string}) =>
            accountApi.sendVerificationCode({channel, purpose, ...values}, securityToken),
        onSuccess: result => {
            if (!mounted.current) return;
            setChallenge(result);
            setRetryUntil(Date.now() + result.retryAfter * 1000);
            setCode('');
            setError('');
            form.setFieldValue('password', undefined);
        },
        onError: showError,
    });
    const verify = useMutation({
        mutationFn: () => accountApi.verifyAccountCode({challengeId: challenge!.challengeId, purpose, code}),
        onSuccess: async () => {
            message.success(t('general.success'));
            await Promise.all([
                queryClient.invalidateQueries({queryKey: ['info']}),
                queryClient.invalidateQueries({queryKey: ['infoQuery']}),
                queryClient.invalidateQueries({queryKey: ['securityTokenSupportTypes']}),
            ]);
            sessionStorage.removeItem('securityToken');
            if (mounted.current) onClose();
        },
        onError: showError,
    });
    const requestCode = (values: {value: string; password?: string}) => {
        setError('');
        if (info.mfaEnabled) {setPending(values); setMfaOpen(true);}
        else send.mutate({values});
    };
    const close = () => {mounted.current = false; onClose();};
    const unavailable = channel === 'email' ? !info.mailVerificationEnabled : !info.smsVerificationEnabled;
    return <>
        <Modal open title={t(channel === 'email' ? 'account.verification.change_email' : 'account.verification.change_phone')}
            onCancel={close} footer={null} mask={{closable: false}} keyboard={!send.isPending && !verify.isPending} closable={!send.isPending && !verify.isPending}>
            <div className="mb-4"><Alert type="info" title={t('account.verification.contact_tip')}/></div>
            {unavailable ? <Alert type="warning" title={t('account.verification.channel_unavailable')}/> : <>
                {!info.mfaEnabled && !info.passwordSet && <div className="mb-4"><Alert type="warning" title={t('account.verification.no_identity_method')}/></div>}
                <Form form={form} layout="vertical" onFinish={requestCode} disabled={send.isPending || verify.isPending}>
                    <Form.Item name="value" label={t(channel === 'email' ? 'account.verification.new_email' : 'account.verification.new_phone')}
                        rules={channel === 'email' ? [{required: true}, {type: 'email'}, {max: 254}] : [{required: true}, {pattern: /^(\+[1-9][0-9]{6,14}|1[3-9][0-9]{9})$/, message: t('account.verification.phone_format')}]}
                        extra={channel === 'sms' ? t('account.verification.phone_format') : undefined}>
                        <Input disabled={!!challenge} autoComplete={channel === 'email' ? 'email' : 'tel'}/>
                    </Form.Item>
                    {!info.mfaEnabled && <Form.Item name="password" label={t('account.verification.current_password')} rules={[{required: true}]}>
                        <Input.Password autoComplete="current-password"/>
                    </Form.Item>}
                    <Form.Item><Button htmlType="submit" loading={send.isPending}
                        disabled={retrySeconds > 0 || (!info.mfaEnabled && !info.passwordSet)}>
                        {retrySeconds > 0 ? t('account.verification.resend_after', {seconds: retrySeconds}) : t('account.verification.send_code')}
                    </Button></Form.Item>
                </Form>
                {challenge && <div className="space-y-4">
                    <div>{t('account.verification.sent_to', {destination: challenge.destination, minutes: challenge.expiresIn / 60})}</div>
                    <Input.OTP length={6} value={code} onChange={setCode} disabled={verify.isPending}/>
                    <div><Space>
                        <Button type="primary" loading={verify.isPending} disabled={!/^\d{6}$/.test(code) || send.isPending} onClick={() => verify.mutate()}>{t('actions.confirm')}</Button>
                        <Button disabled={verify.isPending || send.isPending} onClick={() => {setChallenge(undefined); setCode(''); setError('');}}>{t('account.verification.change_target')}</Button>
                    </Space></div>
                </div>}
            </>}
            {error && <div className="mt-4"><Alert type="error" title={error}/></div>}
        </Modal>
        <MultiFactorAuthentication open={mfaOpen} forceReauth handleCancel={() => {setMfaOpen(false); setPending(undefined);}}
            handleOk={securityToken => {setMfaOpen(false); if (pending) send.mutate({values: pending, securityToken}); setPending(undefined);}}/>
    </>;
};
export default ContactVerificationModal;

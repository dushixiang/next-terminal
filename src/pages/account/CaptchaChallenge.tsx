import {getLocalizedErrorMessage} from '@/api/core/api-error';
import {useEffect, useRef, useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {CheckCircleOutlined, SafetyOutlined} from '@ant-design/icons';
import {Alert, Button, Modal, Slider, Spin} from 'antd';
import {useTranslation} from 'react-i18next';
import accountApi, {type CaptchaProof} from '@/api/account-api';

type Props = {
    purpose?: 'login' | 'sms';
    disabled?: boolean;
    value?: CaptchaProof;
    onChange?: (value?: CaptchaProof) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showTrigger?: boolean;
    onVerified?: (proof: CaptchaProof) => void;
};

const CaptchaChallenge = ({purpose = 'login', disabled, value, onChange, open: controlledOpen,
    onOpenChange, showTrigger = true, onVerified}: Props) => {
    const {t} = useTranslation();
    const [localOpen, setLocalOpen] = useState(false);
    const [x, setX] = useState(0);
    const submittedKey = useRef<string | undefined>(undefined);
    const open = controlledOpen ?? localOpen;
    const setOpen = (next: boolean) => {setLocalOpen(next); onOpenChange?.(next);};
    const challenge = useQuery({
        queryKey: ['captcha-challenge', purpose],
        queryFn: purpose === 'sms' ? accountApi.getSMSLoginCaptcha : accountApi.getCaptcha,
        enabled: open,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
    });
    const verify = useMutation({
        mutationFn: accountApi.verifyCaptcha,
        onSuccess: result => {
            const proof = {key: result.key, expiresAt: Date.now() + result.expiresIn * 1000};
            onChange?.(proof);
            setOpen(false);
            onVerified?.(proof);
        },
        onError: () => {setX(0); challenge.refetch();},
    });
    useEffect(() => {
        if (open) {setX(0); verify.reset();}
    }, [open]);
    useEffect(() => {
        if (!value) return;
        const timeout = window.setTimeout(() => onChange?.(undefined), Math.max(0, value.expiresAt - Date.now()));
        return () => window.clearTimeout(timeout);
    }, [value, onChange]);
    const data = challenge.data;
    const busy = disabled || verify.isPending;
    const error = verify.error || challenge.error;
    const verified = !!value && value.expiresAt > Date.now();
    const refresh = () => {setX(0); verify.reset(); challenge.refetch();};
    return <>
        {showTrigger && <Button block size="large" disabled={disabled || verified}
            icon={verified ? <CheckCircleOutlined/> : <SafetyOutlined/>} onClick={() => setOpen(true)}>
            {t(verified ? 'account.captcha_ui.verified' : 'account.captcha_ui.start')}
        </Button>}
        <Modal title={t('account.captcha_ui.title')} open={open} centered width={364}
            footer={null} closable={!busy} keyboard={!busy} mask={{closable: !busy}}
            onCancel={() => {if (!busy) setOpen(false);}}>
            {error && <div className="mb-3"><Alert type="error" showIcon title={getLocalizedErrorMessage(error, t)}/></div>}
            <Spin spinning={challenge.isFetching || verify.isPending}>
                {data?.image && <>
                    {/* 原图坐标配合百分比布局，图片缩放不改变提交坐标。 */}
                    <div style={{position: 'relative', width: '100%', aspectRatio: `${data.width}/${data.height}`, overflow: 'hidden'}}>
                        <img src={data.image} alt={t('account.captcha_ui.image')} draggable={false} style={{width: '100%', display: 'block'}}/>
                        <img src={data.tile} alt="" draggable={false} style={{position: 'absolute',
                            left: `${x / data.width * 100}%`, top: `${data.tileY / data.height * 100}%`,
                            width: `${data.tileWidth / data.width * 100}%`, pointerEvents: 'none'}}/>
                    </div>
                    <div className="mt-2">{t('account.captcha_ui.slide_hint')}</div>
                    <Slider min={0} max={data.width - data.tileWidth} value={x} disabled={busy || challenge.isFetching || challenge.isError}
                        tooltip={{open: false}} onChange={setX}
                        onChangeComplete={position => {
                            if (busy || challenge.isFetching || challenge.isError || !data.key || submittedKey.current === data.key) return;
                            // 直接提交结束事件中的坐标，防止读到尚未更新的 React 状态；每个挑战只提交一次。
                            submittedKey.current = data.key;
                            verify.mutate({key: data.key, purpose, x: position});
                        }} ariaLabelForHandle={t('account.captcha_ui.slide_hint')}/>
                </>}
            </Spin>
            <Button type="link" onClick={refresh} disabled={busy || challenge.isFetching}>{t('account.captcha_ui.refresh')}</Button>
        </Modal>
    </>;
};
export default CaptchaChallenge;

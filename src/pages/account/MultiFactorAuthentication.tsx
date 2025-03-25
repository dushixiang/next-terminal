import React, {useEffect, useState} from 'react';
import {Button, Modal, Result, Spin} from "antd";
import accountApi from "@/src/api/account-api";
import {startAuthentication} from "@simplewebauthn/browser";
import {REGEXP_ONLY_DIGITS} from "input-otp";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {useMutation} from "@tanstack/react-query";
import strings from "@/src/utils/strings";
import {useTranslation} from "react-i18next";

export interface Props {
    open: boolean
    handleOk: (securityToken: string) => void
    handleCancel: () => void
}

const MultiFactorAuthentication = ({open, handleOk, handleCancel}: Props) => {

    let {t} = useTranslation();

    let [authType, setAuthType] = useState('passkey');
    let [error, setError] = useState('');
    let [loading, setLoading] = useState(false);
    const [otpValue, setOtpValue] = useState<string>("");

    const requestSecurityToken = async () => {
        setError('');
        setLoading(true);
        let data = await accountApi.generateSecurityTokenByWebauthnStart();
        if (data.type === 'mfa') {
            setAuthType('mfa');
            setLoading(false);
            // 使用mfa认证
            return;
        }

        try {
            let authentication = await startAuthentication({
                optionsJSON: data.publicKey,
            });
            let securityToken = await accountApi.generateSecurityTokenByWebauthnFinish(data.token, authentication);
            handleOk(securityToken);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) {
            setError('');
            setLoading(false);
            return;
        }
        if (authType === 'passkey') {
            requestSecurityToken();
        }
    }, [open]);

    let validateTOTP = useMutation({
        mutationFn: accountApi.generateSecurityTokenByMfa,
        onSuccess: securityToken => {
            handleOk(securityToken);
        },
        onError: error => {
            setOtpValue('');
            setError(error.message);
        }
    });

    const handleOTPChange = (value) => {
        if (!validateTOTP.isPending) {
            validateTOTP.mutate(value)
        }
    }

    return (
        <Modal
            title={t('account.mfa')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            footer={false}
            onOk={() => {

            }}
            onCancel={() => {
                handleCancel();
            }}
            confirmLoading={false}
        >
            <Spin tip={t('account.mfa_authing')} spinning={loading}>
                <div className={'h-72 w-full flex items-center justify-center'}>
                    <div className={'space-y-4'}>
                        {authType === 'mfa' &&
                            <div className={'space-y-2'}>
                                <div className={'text-gray-600'}>OTP Code:</div>
                                <InputOTP maxLength={6}
                                          pattern={REGEXP_ONLY_DIGITS}
                                          onComplete={handleOTPChange}
                                          autoFocus={true}
                                          value={otpValue}
                                          onChange={(value) => {setOtpValue(value)}}
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

                                {strings.hasText(error) && <div className={'text-red-500'}>
                                    {error}
                                </div>}
                            </div>
                        }


                        {authType === 'passkey' && strings.hasText(error) && <div>
                            <Result
                                status="error"
                                title={t('account.mfa_auth_failed')}
                                subTitle={error}
                                extra={<div className={'flex items-center justify-center gap-2'}>
                                    <Button color="primary" variant={'solid'} onClick={requestSecurityToken}>{t('account.mfa_retry')}</Button>
                                    <Button color="primary"
                                            variant={'dashed'}
                                            onClick={() => {
                                                setAuthType('mfa');
                                                setError('');
                                            }}>
                                        {t('account.mfa_change_way')}
                                    </Button>
                                </div>}
                            />
                        </div>}
                    </div>
                </div>
            </Spin>
        </Modal>
    );
};

export default MultiFactorAuthentication;
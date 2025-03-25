import React, {useState} from 'react';
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi, {WebauthnCredential} from "@/src/api/account-api";
import {App, Button, List, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {startRegistration} from "@simplewebauthn/browser";
import {KeySquareIcon, PencilLineIcon, Trash2Icon} from "lucide-react";
import dayjs from "dayjs";
import PasskeyModal from "@/src/pages/account/PasskeyModal";

const Passkey = () => {

    let {t} = useTranslation();
    let [open, setOpen] = useState(false);
    let [selected, setSelected] = useState<WebauthnCredential>();
    let {message, modal} = App.useApp();

    let webauthnCredentialsQuery = useQuery({
        queryKey: ['getWebauthnCredentials'],
        queryFn: accountApi.getWebauthnCredentials,
    });

    const register = async () => {
        try {
            let options = await accountApi.webauthnCredentialStart();
            const attestationResponse = await startRegistration({
                optionsJSON: options.publicKey,
            });
            if (!attestationResponse) {
                alert("Credential creation failed");
                return;
            }
            await accountApi.webauthnCredentialFinish(attestationResponse);
            webauthnCredentialsQuery.refetch();
            message.success(t('general.success'));
        } catch (e) {
            message.error(e.message);
        }
    }

    const renderUsedTime = (usedAt: number) => {
        if (usedAt === 0) {
            return '-';
        }
        return dayjs(usedAt).fromNow();
    }

    let mutation = useMutation({
        mutationFn: async (values: any) => {
            await accountApi.updateWebauthnCredentials(selected.id, values);
        },
        onSuccess: () => {
            webauthnCredentialsQuery.refetch();
            setOpen(false);
        }
    });

    return (
        <div className={'space-y-4'}>
            <div className={'flex items-center justify-between'}>
                <Typography.Title level={5} style={{marginTop: 0}}>{t('account.passkey')}</Typography.Title>
                <Button type={'primary'} onClick={register}>
                    {t('account.passkey_add')}
                </Button>
            </div>
            <div>
                <List
                    itemLayout="horizontal"
                    dataSource={webauthnCredentialsQuery.data}
                    renderItem={(item, index) => (
                        <div className={'border rounded-md p-4 flex items-center justify-between mb-2'}>
                            <div className={'space-y-2'}>
                                <div className={'flex items-center gap-4'}>
                                    <KeySquareIcon className={'h-4 w-4'}/>
                                    <div className={'font-medium'}>{item.name}</div>
                                </div>

                                <div
                                    className={'ml-8'}>{t('account.passkey_add_time')}：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                                <div className={'ml-8'}>{t('account.passkey_used_time')}：{renderUsedTime(item.usedAt)}</div>
                            </div>

                            <div className={'flex items-center cursor-pointer gap-4'}>
                                <PencilLineIcon className={'h-4 w-4'}
                                                onClick={() => {
                                                    setSelected(item);
                                                    setOpen(true);
                                                }}
                                />
                                <Trash2Icon className={'h-4 w-4'}
                                            onClick={async () => {
                                                const confirmed = await modal.confirm({
                                                    title: t('account.passkey_delete_title'),
                                                    content: t('account.passkey_delete_content'),
                                                });
                                                if (confirmed) {
                                                    await accountApi.deleteWebauthnCredentials(item.id);
                                                    webauthnCredentialsQuery.refetch();
                                                }
                                            }}
                                />
                            </div>
                        </div>
                    )}
                />
            </div>

            <PasskeyModal
                open={open}
                handleOk={mutation.mutate}
                handleCancel={() => {
                    setOpen(false);
                }}
                confirmLoading={false}
                credential={selected}
            />
        </div>
    );
};

export default Passkey;
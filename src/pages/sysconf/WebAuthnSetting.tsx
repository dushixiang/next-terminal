import React, {useState} from 'react';
import {useTranslation} from "react-i18next";
import {ProForm, ProFormSelect, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {SettingProps} from "@/src/pages/sysconf/SettingPage";

const WebAuthnSetting = ({get, set}: SettingProps) => {

    let [passkeyEnabled, setPasskeyEnabled] = useState<boolean>();
    let {t} = useTranslation();

    const wrapGet = async () => {
        let values = await get();
        setPasskeyEnabled(values['passkey-enabled']);
        values['passkey-origins'] = values['passkey-origins']?.split(',');
        return values;
    }

    const wrapSet = async (values: any) => {
        values['passkey-origins'] = values['passkey-origins']?.join(',');
        return await set(values);
    }

    function isValidOrigin(input: string) {
        try {
            const url = new URL(input);
            return (url.protocol === "http:" || url.protocol === "https:");
        } catch (e) {
            return false; // 无法解析为有效 URL
        }
    }

    return (
        <div>
            <ProForm onFinish={wrapSet} request={wrapGet} autoFocus={false} submitter={{
                resetButtonProps: {
                    style: {display: 'none'}
                }
            }}>
                <ProFormSwitch name="passkey-enabled"
                               label={t("settings.security.passkey.enabled")}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               rules={[{required: true}]}
                               fieldProps={{
                                   checked: passkeyEnabled,
                                   onChange: setPasskeyEnabled,
                               }}
                />

                <div className={'flex items-center gap-2'}>
                    <ProFormText name="passkey-domain"
                                 label={t('settings.security.passkey.domain')}
                                 rules={[{required: passkeyEnabled}]}
                                 disabled={!passkeyEnabled}
                    />

                    <div className={'flex-grow'}>
                        <ProFormSelect
                            name={'passkey-origins'}
                            label={t('settings.security.passkey.origins')}
                            tooltip={t('settings.security.passkey.origins_tip')}
                            disabled={!passkeyEnabled}
                            fieldProps={{
                                mode: 'tags',
                            }}
                            rules={[
                                {required: passkeyEnabled},
                                ({getFieldValue}) => ({
                                    validator(_, value) {
                                        if (!value) {
                                            return Promise.resolve();
                                        }
                                        for (let i = 0; i < value.length; i++) {
                                            let val = value[i];
                                            if (!isValidOrigin(val)) {
                                                return Promise.reject(new Error(t('settings.passkey.origins.error')));
                                            }
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        />
                    </div>
                </div>
            </ProForm>
        </div>
    );
};

export default WebAuthnSetting;
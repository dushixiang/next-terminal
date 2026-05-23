import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {SettingProps} from "@/pages/sysconf/SettingPage";
import {Button, Form, FormInstance, Input, Select, Switch} from 'antd';
import {AimOutlined} from "@ant-design/icons";

const WebAuthnSetting = ({
                             get,
                             set
                         }: SettingProps) => {
    const formRef = useRef<FormInstance>(null);

    let [passkeyEnabled, setPasskeyEnabled] = useState<boolean>();
    let {t} = useTranslation();
    const handleAutoDetect = () => {
        const {
            hostname,
            origin
        } = window.location;
        formRef.current?.setFieldsValue({
            'passkey-domain': hostname,
            'passkey-origins': [origin]
        });
    };
    const wrapGet = async () => {
        let values = await get();
        setPasskeyEnabled(values['passkey-enabled']);
        values['passkey-origins'] = values['passkey-origins']?.split(',');
        return values;
    };
    const wrapSet = async (values: any) => {
        values['passkey-origins'] = values['passkey-origins']?.join(',');
        return await set(values);
    };

    function isValidOrigin(input: string) {
        try {
            const url = new URL(input);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (e) {
            return false; // 无法解析为有效 URL
        }
    }

    useFormRequest(formRef, ["form-request", "web/src/pages/sysconf/WebAuthnSetting.tsx"], wrapGet, true);
    return <div className="w-full max-w-5xl overflow-hidden">
        <Form
            onFinish={wrapSet}
            ref={formRef}
            layout="vertical"
            className="w-full [&_.ant-form-item-label>label]:whitespace-normal"
        >
            <Form.Item name="passkey-enabled" label={t("settings.security.passkey.enabled")} rules={[{
                required: true
            }]} valuePropName="checked">
                <Switch checked={passkeyEnabled} onChange={setPasskeyEnabled} checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}/>
            </Form.Item>

            <Button type="dashed" icon={<AimOutlined/>} disabled={!passkeyEnabled} onClick={handleAutoDetect}
                    className="mb-4 w-full sm:w-auto">
                {t('settings.security.passkey.auto_detect')}
            </Button>

            <div className="grid w-full grid-cols-1 gap-x-4 md:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]">
                <Form.Item name="passkey-domain" label={t('settings.security.passkey.domain')} rules={[{
                    required: passkeyEnabled
                }]} className="min-w-0">
                    <Input disabled={!passkeyEnabled} className="w-full"/>
                </Form.Item>

                <Form.Item name={'passkey-origins'} label={t('settings.security.passkey.origins')}
                           tooltip={t('settings.security.passkey.origins_tip')} rules={[{
                        required: passkeyEnabled
                    }, () => ({
                        validator(_, value) {
                            if (!value) {
                                return Promise.resolve();
                            }
                            for (let i = 0; i < value.length; i++) {
                                let val = value[i];
                                if (!isValidOrigin(val)) {
                                    return Promise.reject(new Error(t('settings.security.passkey.origins_error')));
                                }
                            }
                            return Promise.resolve();
                        }
                    })]}>
                    <Select mode="tags" disabled={!passkeyEnabled} className="w-full min-w-0"/>
                </Form.Item>
            </div>

            <Form.Item className="mb-0">
                <Button type="primary" htmlType="submit" className="w-full sm:w-auto">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default WebAuthnSetting;

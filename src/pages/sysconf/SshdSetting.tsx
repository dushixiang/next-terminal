import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useRef, useState} from 'react';
import {Alert, Button, Form, FormInstance, Input, Modal, Switch, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useMutation} from "@tanstack/react-query";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";

const {
    Title,
    Paragraph,
    Text
} = Typography;
const SshdSetting = ({
                         get,
                         set
                     }: SettingProps) => {
    let {t} = useTranslation();
    const vscodeDirectExample = ['Host nt-prod', '  HostName host', '  Port port', '  User username', '  SetEnv NEXT_TERMINAL_ASSET=asset-alias'].join('\n');
    const formRef = useRef<FormInstance>(null);
    let [enabled, setEnabled] = useState(false);
    let [portForwardEnabled, setPortForwardEnabled] = useState(false);
    let [privateKeyExists, setPrivateKeyExists] = useState(false);
    let [privateKeyModalOpen, setPrivateKeyModalOpen] = useState(false);
    let [privateKeySaving, setPrivateKeySaving] = useState(false);
    let [privateKeyError, setPrivateKeyError] = useState<string>();
    const [privateKeyForm] = Form.useForm();
    const wrapSet = async (values: any) => {
        await formRef.current?.validateFields();
        if (values['ssh-server-enabled'] && !privateKeyExists) {
            setPrivateKeyError(t('settings.sshd.private_key_required_to_enable'));
            return false;
        }
        setPrivateKeyError(undefined);
        await set(values);
    };
    const wrapGet = async () => {
        let values = await get();
        setEnabled(values['ssh-server-enabled']);
        setPortForwardEnabled(values['ssh-server-port-forwarding-enabled']);
        const existsValue = values['ssh-server-private-key-exists'];
        const exists = typeof existsValue === 'string' ? existsValue.toLowerCase() === 'true' : Boolean(existsValue);
        setPrivateKeyExists(exists);
        if (exists) {
            setPrivateKeyError(undefined);
        }
        return values;
    };
    let mutation = useMutation({
        mutationFn: propertyApi.genRSAPrivateKey,
        onSuccess: data => {
            privateKeyForm.setFieldsValue({
                privateKey: data
            });
        }
    });
    const openPrivateKeyModal = () => {
        privateKeyForm.resetFields();
        setPrivateKeyModalOpen(true);
    };
    const handlePrivateKeySave = async () => {
        const values = await privateKeyForm.validateFields();
        setPrivateKeySaving(true);
        try {
            const result = await set({
                'ssh-server-private-key': values.privateKey
            });
            if (result !== false) {
                setPrivateKeyExists(true);
                setPrivateKeyError(undefined);
                setPrivateKeyModalOpen(false);
                privateKeyForm.resetFields();
            }
        } finally {
            setPrivateKeySaving(false);
        }
    };
    useFormRequest(formRef, ["form-request", "web/src/pages/sysconf/SshdSetting.tsx"], wrapGet);
    return <div>
        <Title level={5} style={{
            marginTop: 0
        }}>{t('settings.sshd.setting')}</Title>

        <div className={'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start'}>
            <div>
                <Alert title={t('settings.sshd.tip')} type="info" style={{
                    marginBottom: 10
                }}/>

                <Form onFinish={wrapSet} ref={formRef} layout="vertical">
                    <Form.Item name="ssh-server-enabled" label={t("settings.sshd.enabled")} required={true}
                               valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                                onChange={setEnabled}/>
                    </Form.Item>
                    <Form.Item name="ssh-server-addr" label={t('settings.sshd.addr')} rules={[{
                        required: enabled
                    }]}>
                        <Input placeholder="0.0.0.0:2022" disabled={!enabled}/>
                    </Form.Item>
                    <Form.Item label={t('settings.sshd.private_key')}
                               validateStatus={privateKeyError ? 'error' : undefined} help={privateKeyError}>
                        <div className={'flex items-center gap-2'}>
                            <Button type="primary" onClick={openPrivateKeyModal} disabled={!enabled}>
                                {t('settings.sshd.private_key_button')}
                            </Button>
                            <Typography.Text type={privateKeyExists ? 'success' : 'secondary'}>
                                {privateKeyExists ? t('settings.sshd.private_key_status_set') : t('settings.sshd.private_key_status_empty')}
                            </Typography.Text>
                        </div>
                    </Form.Item>

                    <Form.Item name="ssh-server-port-forwarding-enabled"
                               label={t("settings.sshd.port_forwarding.enabled")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                                onChange={setPortForwardEnabled}/>
                    </Form.Item>
                    <Form.Item name="ssh-server-port-forwarding-host-port"
                               label={t('settings.sshd.port_forwarding.host_port')}
                               extra={t('settings.sshd.port_forwarding.host_port_tip')} rules={[{
                        required: portForwardEnabled
                    }]}>
                        <Input.TextArea disabled={!portForwardEnabled}
                                        placeholder="127.0.0.1:*,172.16.0.1:3306,10.10.0.3:5432" rows={4}/>
                    </Form.Item>
                    <Form.Item name="ssh-server-disable-password-auth" label={t("settings.sshd.disable_password_auth")}
                               valuePropName="checked">
                        <Switch checkedChildren={t('general.yes')} unCheckedChildren={t('general.no')}/>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                    </Form.Item>
                </Form>
            </div>

            <div className={'space-y-3 border rounded-lg p-4'}>
                <div>
                    <div className={'font-medium'}>{t('settings.sshd.usage')}</div>
                    <Text type="secondary">{t('settings.sshd.usage_tip')}</Text>
                </div>
                <div>
                    <div className={'font-medium'}>{t('settings.sshd.mode_proxy')}</div>
                    <Text type="secondary">{t('settings.sshd.mode_proxy_tip')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>ssh username@host -p port</Paragraph>
                </div>
                <div>
                    <div className={'font-medium'}>{t('settings.sshd.direct_proxy')}</div>
                    <Text type="secondary">{t('settings.sshd.direct_proxy_tip')}</Text>
                    <div className={'mt-1'}>
                        <Text>{t('settings.sshd.direct_proxy_cli')}</Text>
                        <Paragraph style={{
                            marginBottom: 0
                        }} copyable={true}>ssh username:asset-name@host -p port</Paragraph>
                    </div>
                    <div className={'mt-1'}>
                        <Text>{t('settings.sshd.direct_proxy_vscode')}</Text>
                        <Paragraph style={{
                            marginBottom: 0,
                            whiteSpace: 'pre-wrap'
                        }} copyable={{
                            text: vscodeDirectExample
                        }}>
                            {vscodeDirectExample}
                        </Paragraph>
                    </div>
                </div>
            </div>
        </div>

        <Modal title={t('settings.sshd.private_key_modal_title')} open={privateKeyModalOpen} onOk={handlePrivateKeySave}
               onCancel={() => setPrivateKeyModalOpen(false)} okText={t('actions.save')}
               cancelText={t('actions.cancel')} confirmLoading={privateKeySaving} destroyOnHidden>
            <Form form={privateKeyForm} layout="vertical">
                <Form.Item name="privateKey" label={t('settings.sshd.private_key')} rules={[{
                    required: true
                }]}>
                    <Input.TextArea rows={8} placeholder={'RSA、EC、DSA、OPENSSH'}/>
                </Form.Item>
                <div className={'flex items-center gap-2'}>
                    <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
                        {t('assets.generate_private_key')}
                    </Button>
                    <Typography.Text type="secondary">
                        {t('settings.sshd.private_key_modal_tip')}
                    </Typography.Text>
                </div>
            </Form>
        </Modal>
    </div>;
};
export default SshdSetting;

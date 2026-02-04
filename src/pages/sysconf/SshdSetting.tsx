import React, {useRef, useState} from 'react';
import {Alert, Button, Form, Input, Modal, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormInstance, ProFormSwitch, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useMutation} from "@tanstack/react-query";
import propertyApi from "../../api/property-api";
import {useTranslation} from "react-i18next";

const {Title, Paragraph} = Typography;

const SshdSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
    let [enabled, setEnabled] = useState(false);
    let [portForwardEnabled, setPortForwardEnabled] = useState(false);
    let [privateKeyExists, setPrivateKeyExists] = useState(false);
    let [privateKeyModalOpen, setPrivateKeyModalOpen] = useState(false);
    let [privateKeySaving, setPrivateKeySaving] = useState(false);
    const [privateKeyForm] = Form.useForm();

    const wrapSet = async (values: any) => {
        await formRef.current?.validateFields();
        await set(values);
    }

    const wrapGet = async () => {
        let values = await get();
        setEnabled(values['ssh-server-enabled']);
        setPortForwardEnabled(values['ssh-server-port-forwarding-enabled']);
        const existsValue = values['ssh-server-private-key-exists'];
        const exists = typeof existsValue === 'string'
            ? existsValue.toLowerCase() === 'true'
            : Boolean(existsValue);
        setPrivateKeyExists(exists);
        return values;
    }

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
            const result = await set({'ssh-server-private-key': values.privateKey});
            if (result !== false) {
                setPrivateKeyExists(true);
                setPrivateKeyModalOpen(false);
                privateKeyForm.resetFields();
            }
        } finally {
            setPrivateKeySaving(false);
        }
    };

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.sshd.setting')}</Title>
            <Alert
                message={t('settings.sshd.tip')}
                type="info"
                style={{marginBottom: 10}}
            />

            <div className={'space-y-1 mb-4 border rounded-lg p-4'}>
                <div className={'font-medium'}>{t('settings.sshd.usage')}</div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('settings.sshd.mode_proxy')}</div>
                    <div><Paragraph style={{marginBottom:0}} copyable={true}>ssh username@host -p port</Paragraph></div>
                </div>
                <div className={'flex items-center gap-2'}>
                    <div>{t('settings.sshd.direct_proxy')}</div>
                    <div><Paragraph style={{marginBottom:0}} copyable={true}>ssh username:asset-name@host -p port</Paragraph></div>
                </div>
            </div>

            <ProForm formRef={formRef} onFinish={wrapSet} request={wrapGet}
                     submitter={{
                         resetButtonProps: {
                             style: {display: 'none'}
                         }
                     }}>
                <ProFormSwitch name="ssh-server-enabled"
                               label={t("settings.sshd.enabled")}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               fieldProps={{
                                   checked: enabled,
                                   onChange: setEnabled,
                               }}
                />
                <ProFormText name="ssh-server-addr"
                             label={t('settings.sshd.addr')}
                             placeholder="0.0.0.0:2022"
                             rules={[{required: enabled}]}
                             disabled={!enabled}/>
                <Form.Item label={t('settings.sshd.private_key')}>
                    <div className={'flex items-center gap-2'}>
                        <Button type="primary" onClick={openPrivateKeyModal} disabled={!enabled}>
                            {t('settings.sshd.private_key_button')}
                        </Button>
                        <Typography.Text type={privateKeyExists ? 'success' : 'secondary'}>
                            {privateKeyExists
                                ? t('settings.sshd.private_key_status_set')
                                : t('settings.sshd.private_key_status_empty')}
                        </Typography.Text>
                    </div>
                </Form.Item>
                <ProFormSwitch name="ssh-server-port-forwarding-enabled"
                               label={t("settings.sshd.port_forwarding.enabled")}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                               fieldProps={{
                                   checked: portForwardEnabled,
                                   onChange: setPortForwardEnabled,
                               }}
                />
                <ProFormTextArea name="ssh-server-port-forwarding-host-port"
                                 label={t('settings.sshd.port_forwarding.host_port')}
                                 rules={[{required: portForwardEnabled}]}
                                 disabled={!portForwardEnabled}
                                 placeholder={'172.16.0.1:3306,10.10.0.3:5432'} fieldProps={{rows: 4}}
                />
                <ProFormSwitch name="ssh-server-disable-password-auth"
                               label={t("settings.sshd.disable_password_auth")}
                               checkedChildren={t('general.yes')}
                               unCheckedChildren={t('general.no')}
                />
            </ProForm>
            <Modal
                title={t('settings.sshd.private_key_modal_title')}
                open={privateKeyModalOpen}
                onOk={handlePrivateKeySave}
                onCancel={() => setPrivateKeyModalOpen(false)}
                okText={t('actions.save')}
                cancelText={t('actions.cancel')}
                confirmLoading={privateKeySaving}
                destroyOnClose
            >
                <Form form={privateKeyForm} layout="vertical">
                    <Form.Item
                        name="privateKey"
                        label={t('settings.sshd.private_key')}
                        rules={[{required: true}]}
                    >
                        <Input.TextArea rows={8} placeholder={'RSA、EC、DSA、OPENSSH'} />
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
        </div>
    );
};

export default SshdSetting;

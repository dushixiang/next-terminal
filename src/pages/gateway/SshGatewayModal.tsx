import {useFormRequest} from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import {Button, Form, Input, InputNumber, Modal, Space, Radio} from 'antd';
import {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import sshGatewayApi from "@/api/ssh-gateway-api";
import credentialApi from "@/api/credential-api";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";
const api = sshGatewayApi;
interface Props {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    id: string | undefined;
}
const SshGatewayModal = ({
    open,
    handleOk,
    handleCancel,
    confirmLoading,
    id
}: Props) => {
    const [form] = Form.useForm();
    let {t} = useTranslation();
    let [decrypted, setDecrypted] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);
    useEffect(() => {
        if (!open) {
            setDecrypted(false);
        }
    }, [open]);
    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            configMode: 'direct',
            accountType: 'password',
            port: 22
        };
    };
    const renderAccountType = (accountType: string) => {
        switch (accountType) {
            case 'credential':
                return <>
                    <Form.Item label={t('menus.resource.submenus.credential')} name='credentialId' rules={[{
                        required: true
                    }]}>
                        <QuerySelect queryKey={['credentials']} request={async () => {
                            let credentials = await credentialApi.getAll();
                            return credentials.map(item => {
                                return {
                                    label: item.name,
                                    value: item.id
                                };
                            });
                        }} />
                    </Form.Item>
                </>;
            case 'password':
                return <>
                    <Form.Item label={t('assets.username')} name='username' rules={[{
                        required: true
                    }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('assets.password')} name='password' rules={[{
                        required: true
                    }]}>
                        <Input.Password
                            iconRender={visible => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                            visibilityToggle={{
                                // visible: !decrypted,
                                onVisibleChange: visible => {
                                    if (id && visible && !decrypted) {
                                        setMfaOpen(true);
                                    }
                                }
                            }} />
                    </Form.Item>
                </>;
            case 'private-key':
                return <>
                    <Form.Item label={t('assets.username')} name='username' rules={[{
                        required: true
                    }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label={t('assets.private_key')} name='privateKey' rules={[{
                        required: true
                    }]}>
                        <Input.TextArea
                            rows={4} />
                    </Form.Item>
                    {id && <div className={'mb-2 -mt-2'}>
                        <Button color={'purple'} variant={'filled'} onClick={async () => {
                            setMfaOpen(true);
                        }}>
                            {t('actions.view_private_key')}
                        </Button>
                    </div>}

                    <Form.Item label={t('assets.passphrase')} name='passphrase'>
                        <Input.Password />
                    </Form.Item>
                </>;
        }
    };
    useFormRequest(form, ["form-request", "web/src/pages/gateway/SshGatewayModal.tsx", open, id], get, {enabled: open});
    return <Modal
        title={id ? t('actions.edit') : t('actions.new')}
        open={open}
        mask={{closable: false}}
        destroyOnHidden={true}
        onOk={() => {
            form.validateFields().then(async values => {
                handleOk(values);
            });
        }}
        onCancel={() => {
            handleCancel();
        }}
        confirmLoading={confirmLoading}
    >

        <Form form={form} clearOnDestroy={true} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input />
            </Form.Item>
            <Form.Item name={'name'} label={t('general.name')} required={true}>
                <Input />
            </Form.Item>

            {/* 配置模式选择 */}
            <Form.Item label={t('gateways.config_mode')} name='configMode' required={true}>
                <Radio.Group options={[{
                    label: t('gateways.config_mode_direct'),
                    value: 'direct'
                }, {
                    label: t('gateways.config_mode_credential'),
                    value: 'credential'
                }, {
                    label: t('gateways.config_mode_asset'),
                    value: 'asset'
                }]} />
            </Form.Item>

            <Form.Item noStyle={true} shouldUpdate={true}>
                {form => {
                    const configMode = form.getFieldValue('configMode');
                    if (configMode === 'direct') {
                    // 直接配置模式
                    return <>
                        <Form.Item label={t('assets.addr')} className={'nesting-form-item'} rules={[{
                            required: true
                        }]}>
                            <Space.Compact block>
                                <Form.Item noStyle name='ip' rules={[{
                                    required: true
                                }]}>
                                    <Input style={{
                                        width: '70%'
                                    }} placeholder={t('assets.host_placeholder')} />
                                </Form.Item>
                                <Form.Item noStyle name='port' rules={[{
                                    required: true
                                }]}>
                                    <InputNumber style={{
                                        width: '30%'
                                    }} min={1} max={65535} placeholder='1-65535' />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item label={t('assets.account_type')} name='accountType' rules={[{
                            required: true
                        }]}>
                            <Radio.Group options={[{
                                label: t('assets.password'),
                                value: 'password'
                            }, {
                                label: t('assets.private_key'),
                                value: 'private-key'
                            }]} />
                        </Form.Item>
                        <Form.Item noStyle={true} shouldUpdate={true}>
                            {form => {
                                const accountType = form.getFieldValue('accountType');
                                return renderAccountType(accountType);
                            }}
                        </Form.Item>
                    </>;
                    } else if (configMode === 'credential') {
                    // 凭据模式
                    return <>
                        <Form.Item label={t('assets.addr')} className={'nesting-form-item'} rules={[{
                            required: true
                        }]}>
                            <Space.Compact block>
                                <Form.Item noStyle name='ip' rules={[{
                                    required: true
                                }]}>
                                    <Input style={{
                                        width: '70%'
                                    }} placeholder={t('assets.host_placeholder')} />
                                </Form.Item>
                                <Form.Item noStyle name='port' rules={[{
                                    required: true
                                }]}>
                                    <InputNumber style={{
                                        width: '30%'
                                    }} min={1} max={65535} placeholder='1-65535' />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>

                        <Form.Item label={t('menus.resource.submenus.credential')} name='credentialId' rules={[{
                            required: true
                        }]}>
                            <QuerySelect queryKey={['credentials']} request={async () => {
                                let credentials = await credentialApi.getAll();
                                return credentials.map(item => {
                                    return {
                                        label: item.name,
                                        value: item.id
                                    };
                                });
                            }} />
                        </Form.Item>
                    </>;
                } else if (configMode === 'asset') {
                    // 资产模式
                    return <>
                        <Form.Item label={t('gateways.ssh_asset')} name='assetId' rules={[{
                            required: true
                        }]}>
                            <QuerySelect
                                queryKey={['ssh-gateway-available-assets']}
                                showSearch={true}
                                optionFilterProp='label'
                                request={async () => {
                                    let assets = await api.getAvailableAssets();
                                    return assets.map(item => {
                                        return {
                                            label: `${item.name} (${item.ip}:${item.port})`,
                                            value: item.id,
                                            disabled: !item.canBeGateway,
                                            title: item.disableReason || `${item.ip}:${item.port}`
                                        };
                                    });
                                }} />
                        </Form.Item>
                    </>;
                }
                    return null;
                }}
            </Form.Item>
        </Form>

        <MultiFactorAuthentication open={mfaOpen} handleOk={async securityToken => {
            if (!id) {
                return;
            }
            const res = await api.decrypt(id, securityToken);
            form.setFieldsValue(res);
            setDecrypted(true);
            setMfaOpen(false);
        }} handleCancel={() => setMfaOpen(false)} />
    </Modal>;
};
export default SshGatewayModal;

import {useFormRequest} from "@/hook/use-antd-form-query";
import QuerySelect from "@/components/QuerySelect";
import React, {forwardRef, useImperativeHandle, useState} from 'react';
import {App, Button, Form, Input, InputNumber, Radio, Segmented, Space, Tabs, TreeDataNode} from 'antd';
import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import assetsApi, {Asset} from "../../api/asset-api";
import agentGatewayApi from "@/api/agent-gateway-api";
import strings from "@/utils/strings";
import sshGatewayApi from "@/api/ssh-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import AssetLogo from "./components/AssetLogo";
import AccountTypeForm from "./components/AccountTypeForm";
import {AssetAdvancedSection, getAssetAdvancedItems} from "./components/AssetAdvancedSettings";
import ProFormTreeSelect from "@/components/ProFormTreeSelect";

const protocolOptions = [
    {
        label: 'SSH',
        value: 'ssh'
    }, {
        label: 'RDP',
        value: 'rdp'
    }, {
        label: 'VNC',
        value: 'vnc'
    }, {
        label: 'Telnet',
        value: 'telnet'
    }
];

interface AssetsInfoProps {
    hideLogo?: boolean;
    assetId?: string;
    groupId?: string;
    copy?: boolean;
    onClose?: () => void;
    onSuccess?: (asset?: Asset) => void;
    showAdvanced?: boolean;
    canDetectOS?: boolean;
    detectOSLoading?: boolean;
    onDetectOS?: () => void;
    canWOL?: boolean;
    wolLoading?: boolean;
    onWOL?: () => void;
}

export interface AssetsPostRef {
    refreshLogo: () => Promise<void>;
}

const AssetsPost = forwardRef(function ({
                                            hideLogo,
                                            assetId,
                                            groupId,
                                            copy,
                                            onClose,
                                            onSuccess,
                                            showAdvanced = true,
                                            canDetectOS,
                                            detectOSLoading,
                                            onDetectOS,
                                            canWOL,
                                            wolLoading,
                                            onWOL
                                        }: AssetsInfoProps, ref: React.ForwardedRef<AssetsPostRef>) {
    let {t} = useTranslation();
    const [form] = Form.useForm();
    const protocol = Form.useWatch('protocol', form);
    const accountType = Form.useWatch('accountType', form);
    const gatewayType = Form.useWatch('gatewayType', form);
    let [logo, setLogo] = useState<string>();
    let [decrypted, setDecrypted] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);
    let {message} = App.useApp();

    useImperativeHandle(ref, () => ({
        refreshLogo: async () => {
            if (assetId) {
                const asset = await assetsApi.getById(assetId);
                setLogo(strings.hasText(asset.logo) ? asset.logo : undefined);
            }
        }
    }));

    const get = async () => {
        if (assetId) {
            let asset = await assetsApi.getById(assetId);
            if (strings.hasText(asset.logo)) {
                setLogo(asset.logo);
            }
            if (copy === true) {
                asset.password = '';
                asset.privateKey = '';
                asset.passphrase = '';
                asset.alias = '';
            }
            return asset;
        }
        return {
            protocol: 'ssh',
            port: 22,
            accountType: 'password',
            gatewayType: '',
            attrs: {
                "disable-audio": true,
                "enable-drive": true,
                "security": "any",
                "ignore-cert": true
            },
            groupId: groupId
        } as Asset;
    };
    const postOrUpdate = async (values: any) => {
        values['logo'] = logo;
        if (!copy && values['id']) {
            await assetsApi.updateById(values['id'], values);
            return undefined;
        } else {
            delete values['id'];
            return await assetsApi.create(values);
        }
    };
    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: (asset) => {
            message.success(t('general.success'));
            onSuccess?.(asset);
            if (onClose) {
                onClose();
            }
        }
    });

    type AssetSection = 'basic' | AssetAdvancedSection;

    const sectionFields: Record<AssetSection, any[]> = {
        basic: [
            'logo',
            'name',
            'alias',
            'protocol',
            'ip',
            'port',
            'accountType',
            'credentialId',
            'username',
            'password',
            'privateKey',
            'passphrase',
            'gatewayType',
            'gatewayId',
            'tags',
            'groupId',
            'description'
        ],
        security_settings: [
            ['attrs', 'security'],
            ['attrs', 'ignore-cert'],
            ['attrs', 'cert-tofu'],
            ['attrs', 'cert-fingerprints'],
            ['attrs', 'disable-auth']
        ],
        display_settings: [
            ['attrs', 'color-depth'],
            ['attrs', 'force-lossless'],
            ['attrs', 'width'],
            ['attrs', 'height'],
            ['attrs', 'resize-method']
        ],
        audio_settings: [
            ['attrs', 'disable-audio'],
            ['attrs', 'enable-audio-input']
        ],
        domain: [
            ['attrs', 'domain']
        ],
        PDU: [
            ['attrs', 'preconnection-id'],
            ['attrs', 'preconnection-blob']
        ],
        'remote-app': [
            ['attrs', 'remote-app'],
            ['attrs', 'remote-app-dir'],
            ['attrs', 'remote-app-args']
        ],
        'rdp-drive': [
            ['attrs', 'enable-drive'],
            ['attrs', 'drive-path']
        ],
        terminal_settings: [
            ['attrs', 'disableAliveCheck'],
            ['attrs', 'disableDetectOS'],
            ['attrs', 'env']
        ],
        'wol-settings': [
            ['attrs', 'wol-enabled'],
            ['attrs', 'wol-mac-addr'],
            ['attrs', 'wol-broadcast'],
            ['attrs', 'wol-wakeup-delay']
        ]
    };

    const saveSection = async (section: AssetSection) => {
        await form.validateFields(sectionFields[section]);
        const values = form.getFieldsValue(true) as Asset;

        if (section === 'basic') {
            values.logo = logo || '';
            if (values.id) {
                await assetsApi.updateBasic(values.id, values);
                return undefined;
            }
            delete (values as any).id;
            return await assetsApi.create(values);
        }

        if (!assetId) {
            return undefined;
        }
        await assetsApi.updateAdvanced(assetId, {attrs: values.attrs || {}});
        return undefined;
    };

    const sectionMutation = useMutation({
        mutationFn: saveSection,
        onSuccess: (asset) => {
            message.success(t('general.success'));
            onSuccess?.(asset);
            if (asset?.id && onClose) {
                onClose();
            }
        }
    });

    const wrapSet = async (values: any) => {
        form.validateFields().then(() => {
            mutation.mutate(values);
        });
    };
    const renderProtocol = (protocol?: string) => {
        if (protocol === 'telnet') {
            return null;
        }

        const accountTypeOptions = [
            {
                label: t('assets.password'),
                value: 'password'
            },
            {
                label: t('assets.private_key'),
                value: 'private-key',
                disabled: protocol !== 'ssh'
            },
            {
                label: t('menus.resource.submenus.credential'),
                value: 'credential'
            }
        ];

        return (
            <>
                <Form.Item label={t('assets.account_type')} name='accountType' required={true}>
                    <Radio.Group options={accountTypeOptions}/>
                </Form.Item>
                <AccountTypeForm
                    accountType={accountType}
                    protocol={protocol || ''}
                    assetId={assetId}
                    copy={copy}
                    decrypted={decrypted}
                    setDecrypted={setDecrypted}
                    setMfaOpen={setMfaOpen}
                    form={form}
                />
            </>
        );
    };
    const renderGateway = () => {
        if (gatewayType === 'ssh') {
            return <Form.Item key="ssh" label={t('menus.gateway.submenus.ssh_gateway')} name='gatewayId'
                              rules={[{
                                  required: true
                              }]}>
                <QuerySelect showSearch params={{
                    gatewayType
                }} request={sshGatewayRequest}/>
            </Form.Item>;
        }
        if (gatewayType === 'agent') {
            return <Form.Item key="agent" label={t('menus.gateway.submenus.agent_gateway')} name='gatewayId'
                              rules={[{
                                  required: true
                              }]}>
                <QuerySelect showSearch params={{
                    gatewayType
                }} request={agentGatewayRequest}/>
            </Form.Item>;
        }
        if (gatewayType === 'group') {
            return <Form.Item key="group" label={t('menus.gateway.submenus.gateway_group')} name='gatewayId'
                              rules={[{
                                  required: true
                              }]}>
                <QuerySelect showSearch params={{
                    gatewayType
                }} request={gatewayGroupRequest}/>
            </Form.Item>;
        }
        return null;
    };
    const transformData = (data: TreeDataNode[]) => {
        return data.map(item => {
            const newItem = {
                title: item.title,
                value: item.key as string,
                children: []
            };
            if (item.children) {
                newItem.children = transformData(item.children);
            }
            return newItem;
        });
    };


    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    const gatewayGroupRequest = async () => {
        const items = await gatewayGroupApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id
        }));
    };
    useFormRequest(form, ["form-request", "web/src/pages/assets/AssetPost.tsx", assetId, groupId, copy], get);

    const renderSectionActions = (section: AssetSection) => {
        if (!showAdvanced) {
            return null;
        }
        return (
            <Form.Item className="mt-6 mb-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="primary"
                        loading={sectionMutation.isPending && sectionMutation.variables === section}
                        onClick={() => sectionMutation.mutate(section)}
                    >
                        {t('actions.save')}
                    </Button>
                    {section === 'wol-settings' && canWOL && (
                        <Button loading={wolLoading} onClick={onWOL}>
                            {t('assets.wol_send')}
                        </Button>
                    )}
                </div>
            </Form.Item>
        );
    };

    const renderPane = (section: AssetSection, children: React.ReactNode) => (
        <div className="min-h-130 pr-2">
            {children}
            {renderSectionActions(section)}
        </div>
    );

    const basicFields = (
        <>
            <Form.Item hidden={true} name={'id'}>
                <Input/>
            </Form.Item>

            {hideLogo ? null : (
                <AssetLogo
                    value={logo}
                    onChange={setLogo}
                    extra={canDetectOS && (
                        <Button size="small" loading={detectOSLoading} onClick={onDetectOS}>
                            {t('assets.auto_detect_logo')}
                        </Button>
                    )}
                />
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Form.Item name={'name'} label={t('general.name')} required={true}>
                    <Input/>
                </Form.Item>

                <Form.Item name={'alias'} label={t('assets.alias')}
                           tooltip={t('assets.alias_tip')}
                           rules={[{
                               pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
                               message: t('assets.alias_invalid')
                           }]}>
                    <Input placeholder={t('assets.alias_placeholder')}/>
                </Form.Item>

                <ProFormTreeSelect name="groupId" label={t('assets.group')}
                                   allowClear
                                   request={async () => {
                                       let tree = await assetsApi.getGroups();
                                       return transformData(tree);
                                   }}
                                   fieldProps={{
                                       treeDefaultExpandAll: true,
                                       style: {
                                           width: '100%'
                                       }
                                   }}
                />
            </div>

            <div>
                <Space>
                    <Form.Item label={t('assets.protocol')} name='protocol' required={true}>
                        <Segmented
                            options={protocolOptions}
                            onChange={value => {
                                let port = 0;
                                switch (value) {
                                    case 'rdp':
                                        port = 3389;
                                        break;
                                    case 'vnc':
                                        port = 5900;
                                        break;
                                    case 'ssh':
                                        port = 22;
                                        break;
                                    case 'telnet':
                                        port = 23;
                                        break;
                                }
                                form.setFieldsValue({
                                    port: port
                                });
                            }}
                        />
                    </Form.Item>

                    <Form.Item label={t('assets.addr')} className={'nesting-form-item'}>
                        <Space.Compact block>
                            <Form.Item noStyle name='ip' required={true}>
                                <Input style={{
                                    width: 'calc(100% - 120px)'
                                }} placeholder="127.0.0.1" onKeyDown={e => {
                                    if (e.key === " ") {
                                        e.preventDefault(); // 阻止输入空格
                                    }
                                }}/>
                            </Form.Item>

                            <Form.Item noStyle name='port' required={true}>
                                <InputNumber style={{
                                    width: '120px'
                                }} min={1} max={65535} placeholder='0'/>
                            </Form.Item>
                        </Space.Compact>
                    </Form.Item>
                </Space>
            </div>


            {renderProtocol(protocol)}

            <Form.Item label={t('assets.gateway_type')} name='gatewayType'>
                <Radio.Group options={[
                    {
                        label: t('assets.no_gateway'),
                        value: ''
                    }, {
                        label: t('menus.gateway.submenus.ssh_gateway'),
                        value: 'ssh'
                    }, {
                        label: t('menus.gateway.submenus.agent_gateway'),
                        value: 'agent'
                    }, {
                        label: t('menus.gateway.submenus.gateway_group'),
                        value: 'group'
                    }
                ]}/>
            </Form.Item>

            {renderGateway()}

            <Form.Item label={t('assets.tags')} name='tags'>
                <QuerySelect mode={'tags'} showSearch request={async () => {
                    let tags = await assetsApi.getTags();
                    return tags.map(tag => ({
                        label: tag,
                        value: tag
                    }));
                }}/>
            </Form.Item>


            <Form.Item label={t('general.remark')} name='description'>
                <Input.TextArea rows={4}/>
            </Form.Item>
        </>
    );

    const advancedTabs = getAssetAdvancedItems(protocol || '', t).map(item => ({
        ...item,
        children: renderPane(item.key as AssetAdvancedSection, item.children)
    }));

    const tabsItems = [
        {
            key: 'basic',
            label: t('assets.general'),
            children: renderPane('basic', basicFields),
            forceRender: true
        },
        ...advancedTabs
    ];

    return <div>
        <Form layout="vertical" onFinish={wrapSet} form={form}>
            {showAdvanced ? (
                <Tabs
                    tabPlacement="start"
                    items={tabsItems}
                    defaultActiveKey="basic"
                />
            ) : basicFields}
        </Form>

        <MultiFactorAuthentication open={mfaOpen} handleOk={async securityToken => {
            const res = await assetsApi.decrypt(assetId, securityToken);
            form.setFieldsValue({
                'password': res.password,
                'privateKey': res.privateKey,
                'passphrase': res.passphrase
            });
            setDecrypted(true);
            setMfaOpen(false);
        }} handleCancel={() => setMfaOpen(false)}/>
    </div>;
});
export default AssetsPost;

import React, {useRef, useState} from 'react';
import {App, Collapse, Form, Input, InputNumber, Space, theme, TreeDataNode,} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormRadio,
    ProFormSegmented,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    ProFormTreeSelect
} from "@ant-design/pro-components";
import {CaretRightOutlined} from '@ant-design/icons';
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
import AssetAdvancedSettings from "./components/AssetAdvancedSettings";

const formItemLayout = {
    labelCol: {span: 4},
    wrapperCol: {span: 10},
}

interface AssetsInfoProps {
    assetId?: string
    groupId?: string
    copy?: boolean
    onClose?: () => void
}

const AssetsPost = function ({assetId, groupId, copy, onClose}: AssetsInfoProps) {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);

    let [logo, setLogo] = useState<string>();
    let [decrypted, setDecrypted] = useState(false);
    let [mfaOpen, setMfaOpen] = useState(false);

    let {message} = App.useApp();

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
            attrs: {
                "disable-audio": true,
                "enable-drive": true,
                "security": "any",
                "ignore-cert": true,
            },
            groupId: groupId,
        } as Asset;
    }

    const postOrUpdate = async (values: any) => {
        values['logo'] = logo;
        if (!copy && values['id']) {
            await assetsApi.updateById(values['id'], values);
        } else {
            delete values['id']
            await assetsApi.create(values);
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            message.success(t('general.success'));
            if (onClose) {
                onClose();
            }
        }
    });

    const wrapSet = async (values: any) => {
        formRef.current?.validateFields()
            .then(() => {
                mutation.mutate(values);
            })
    }

    const renderProtocol = (protocol: string) => {
        switch (protocol) {
            case "telnet":
                return null;
            default:
                return (
                    <>
                        <ProFormRadio.Group
                            label={t('assets.account_type')} name='accountType' rules={[{required: true}]}
                            options={[
                                {label: t('assets.password'), value: 'password'},
                                {label: t('assets.private_key'), value: 'private-key', disabled: protocol !== 'ssh'},
                                {label: t('menus.resource.submenus.credential'), value: 'credential'},
                            ]}
                        />
                        <ProFormDependency name={['accountType']}>
                            {({accountType}) => (
                                <AccountTypeForm
                                    accountType={accountType}
                                    protocol={protocol}
                                    assetId={assetId}
                                    copy={copy}
                                    decrypted={decrypted}
                                    setDecrypted={setDecrypted}
                                    setMfaOpen={setMfaOpen}
                                    formRef={formRef}
                                />
                            )}
                        </ProFormDependency>
                    </>
                );
        }
    }

    const transformData = (data: TreeDataNode[]) => {
        return data.map(item => {
            const newItem = {
                title: item.title,
                value: item.key as string,
                children: [],
            };
            if (item.children) {
                newItem.children = transformData(item.children);
            }
            return newItem;
        });
    };

    const {token} = theme.useToken();

    const panelStyle: React.CSSProperties = {
        marginBottom: 24,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
        border: 'none',
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const gatewayGroupRequest = async () => {
        const items = await gatewayGroupApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    return (
        <div className="px-4">
            <ProForm {...formItemLayout}
                     formRef={formRef} layout={'horizontal'}
                     request={get} onFinish={wrapSet}
            >
                <ProFormText hidden={true} name={'id'}/>

                <AssetLogo value={logo} onChange={setLogo}/>

                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>

                <ProFormText
                    name={'alias'}
                    label={t('assets.alias')}
                    placeholder={t('assets.alias_placeholder')}
                    extra={t('assets.alias_tip')}
                    rules={[
                        {
                            pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
                            message: t('assets.alias_invalid'),
                        },
                    ]}
                />

                <ProFormSegmented
                    label={t('assets.protocol')} name='protocol' rules={[{required: true}]}
                    valueEnum={{
                        ssh: 'SSH',
                        rdp: 'RDP',
                        vnc: 'VNC',
                        telnet: 'Telnet',
                    }}
                    fieldProps={{
                        onChange: (value) => {
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
                            formRef.current.setFieldsValue({
                                port: port
                            })
                        }
                    }}
                />

                <Form.Item label={t('assets.addr')} className={'nesting-form-item'}>
                    <Space.Compact block>
                        <Form.Item noStyle name='ip'
                                   rules={[{required: true}]}>
                            <Input style={{width: '70%'}}
                                   placeholder="127.0.0.1"
                                   onKeyDown={(e) => {
                                       if (e.key === " ") {
                                           e.preventDefault(); // 阻止输入空格
                                       }
                                   }}
                            />
                        </Form.Item>

                        <Form.Item noStyle name='port' rules={[{required: true}]}>
                            <InputNumber style={{width: '30%'}} min={1} max={65535} placeholder='0'/>
                        </Form.Item>
                    </Space.Compact>
                </Form.Item>

                <ProFormDependency name={['protocol']}>
                    {({protocol}) => renderProtocol(protocol)}
                </ProFormDependency>

                <ProFormRadio.Group
                    label={t('assets.gateway_type')}
                    name='gatewayType'
                    options={[
                        {label: t('assets.no_gateway'), value: ''},
                        {label: t('menus.gateway.submenus.ssh_gateway'), value: 'ssh'},
                        {label: t('menus.gateway.submenus.agent_gateway'), value: 'agent'},
                        {label: t('menus.gateway.submenus.gateway_group'), value: 'group'},
                    ]}
                />

                <ProFormDependency name={['gatewayType']}>
                    {({gatewayType}) => {
                        if (gatewayType === 'ssh') {
                            return (
                                <ProFormSelect
                                    key="ssh"
                                    label={t('menus.gateway.submenus.ssh_gateway')}
                                    name='gatewayId'
                                    request={sshGatewayRequest}
                                    params={{gatewayType}}
                                    showSearch
                                    rules={[{required: true}]}
                                />
                            );
                        } else if (gatewayType === 'agent') {
                            return (
                                <ProFormSelect
                                    key="agent"
                                    label={t('menus.gateway.submenus.agent_gateway')}
                                    name='gatewayId'
                                    request={agentGatewayRequest}
                                    params={{gatewayType}}
                                    showSearch
                                    rules={[{required: true}]}
                                />
                            );
                        } else if (gatewayType === 'group') {
                            return (
                                <ProFormSelect
                                    key="group"
                                    label={t('menus.gateway.submenus.gateway_group')}
                                    name='gatewayId'
                                    request={gatewayGroupRequest}
                                    params={{gatewayType}}
                                    showSearch
                                    rules={[{required: true}]}
                                />
                            );
                        }
                        return null;
                    }}
                </ProFormDependency>

                <ProFormSelect
                    label={t('assets.tags')} name='tags'
                    fieldProps={{
                        mode: 'tags'
                    }}
                    request={async () => {
                        let tags = await assetsApi.getTags();
                        return tags.map(tag => ({
                            label: tag,
                            value: tag,
                        }));
                    }}
                    showSearch
                />

                <ProFormTreeSelect
                    name="groupId"
                    label={t('assets.group')}
                    allowClear
                    request={async () => {
                        let tree = await assetsApi.getGroups();
                        return transformData(tree)
                    }}
                    fieldProps={{
                        treeDefaultExpandAll: true,
                    }}
                />

                <ProFormTextArea label={t('general.remark')} name='description'
                                 fieldProps={{rows: 4}}/>

                <Collapse
                    defaultActiveKey={['advanced_setting']}
                    ghost
                    expandIcon={({isActive}) => <CaretRightOutlined rotate={isActive ? 90 : 0}/>}
                    style={{background: token.colorBgContainer}}
                    items={[
                        {
                            label: t('assets.advanced_setting'),
                            key: 'advanced_setting',
                            children: (
                                <ProFormDependency name={['protocol']}>
                                    {({protocol}) => (
                                        <AssetAdvancedSettings protocol={protocol}/>
                                    )}
                                </ProFormDependency>
                            ),
                            style: panelStyle,
                        }
                    ]}
                />
            </ProForm>

            <MultiFactorAuthentication
                open={mfaOpen}
                handleOk={async (securityToken) => {
                    const res = await assetsApi.decrypt(assetId, securityToken);
                    formRef.current?.setFieldsValue({
                        'password': res.password,
                        'privateKey': res.privateKey,
                        'passphrase': res.passphrase,
                    });
                    setDecrypted(true);
                    setMfaOpen(false);
                }}
                handleCancel={() => setMfaOpen(false)}
            />
        </div>
    )
}

export default AssetsPost;

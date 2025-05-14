import React, {useRef, useState} from 'react';
import {
    App,
    Button,
    Collapse,
    Form,
    Input,
    InputNumber,
    Popover,
    Space,
    Tabs,
    theme,
    TreeDataNode,
    Upload,
} from "antd";
import {
    ProForm,
    ProFormDependency,
    ProFormDigit,
    ProFormInstance,
    ProFormRadio,
    ProFormSegmented,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea,
    ProFormTreeSelect
} from "@ant-design/pro-components";
import {CaretRightOutlined, EyeInvisibleOutlined, EyeTwoTone} from '@ant-design/icons';
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import credentialApi from "../../api/credential-api";
import assetsApi, {Asset} from "../../api/asset-api";
import agentGatewayApi from "@/src/api/agent-gateway-api";
import {RcFile} from "antd/es/upload";
import strings from "@/src/utils/strings";
import sshGatewayApi from "@/src/api/ssh-gateway-api";
import storageApi from "@/src/api/storage-api";
import {TrashIcon, UploadIcon} from "lucide-react";
import MultiFactorAuthentication from "@/src/pages/account/MultiFactorAuthentication";

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
    const formRef = useRef<ProFormInstance>();

    let logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

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

    const renderAccountType = (accountType: string) => {
        if (accountType === 'credential') {
            return <>
                <ProFormSelect
                    label={t('assets.credential')} name='credentialId'
                    rules={[{required: true}]}
                    request={async () => {
                        let credentials = await credentialApi.getAll();
                        return credentials.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                            }
                        });
                    }}
                    showSearch
                />
            </>;
        }
        switch (accountType) {
            case 'password':
                return <>
                    <ProFormText label={t('assets.username')} name='username'/>
                    <ProFormText.Password label={t('assets.password')}
                                          name='password'
                                          fieldProps={{
                                              iconRender: (visible) => (visible ? <EyeTwoTone/> :
                                                  <EyeInvisibleOutlined/>),
                                              visibilityToggle: {
                                                  onVisibleChange: (visible) => {
                                                      if (assetId && !copy && visible && !decrypted) {
                                                          setMfaOpen(true)
                                                      }
                                                  }
                                              },
                                              onChange: (e) => {
                                                  let val = e.target.value;
                                                  if(val.startsWith("******")){
                                                      val = val.substring(6);
                                                      formRef.current?.setFieldValue('password', val);
                                                      setDecrypted(true);
                                                  }
                                              }
                                          }}
                    />
                </>
            case 'private-key':
                return <>
                    <ProFormText label={t('assets.username')} name='username' rules={[{required: true}]}/>
                    <ProFormTextArea label={t('assets.private_key')}
                                     name='privateKey'
                                     rules={[{required: true}]}
                                     fieldProps={{
                                         rows: 4,
                                         allowClear: true,
                                     }}
                    />
                    <Form.Item label={null}>
                        <div className={'-mt-2'}>
                            <Button color={'purple'}
                                    variant={'filled'}
                                    onClick={async () => {
                                        setMfaOpen(true)
                                    }}
                            >
                                {t('actions.view_private_key')}
                            </Button>
                        </div>
                    </Form.Item>
                    <ProFormText.Password label={t('assets.passphrase')} name='passphrase'/>
                </>
        }
    }

    const renderProtocol = (protocol: string) => {
        switch (protocol) {
            case 'kubernetes':
                return <>
                    <ProFormText name={'namespace'} label={t('assets.namespace')} rules={[{required: true}]}/>
                    <ProFormText name={'pod'} label={t('assets.pod')} rules={[{required: true}]}/>
                    <ProFormText name={'container'} label={t('assets.container')} rules={[{required: true}]}/>
                </>;
            case "telnet":
                return <div>

                </div>
            default:
                return <>
                    <ProFormRadio.Group
                        label={t('assets.account_type')} name='accountType' rules={[{required: true}]}
                        options={[
                            {label: t('assets.password'), value: 'password'},
                            {label: t('assets.private_key'), value: 'private-key', disabled: protocol !== 'ssh'},
                            {label: t('assets.credential'), value: 'credential'},
                        ]}
                    />
                    <ProFormDependency name={['accountType']}>
                        {
                            ({accountType}) => {
                                return renderAccountType(accountType)
                            }
                        }
                    </ProFormDependency>
                </>
        }
    }

    const displaySetting = {
        key: 'display_settings',
        label: t('assets.display_settings'),
        children: <>
            <ProFormSelect name={["attrs", "color-depth"]}
                           label={t("assets.color_depth")}
                           fieldProps={{
                               options: [
                                   {value: '', label: t('general.default')},
                                   {value: '8', label: '8'},
                                   {value: '16', label: '16'},
                                   {value: '24', label: '24'},
                                   {value: '32', label: '32'},
                               ]
                           }}
            />
            <ProFormSwitch
                name={["attrs", "force-lossless"]}
                label={t('assets.force_lossless')}
            />
            <ProFormDigit
                name={['attrs', 'width']}
                label={t('assets.width')}
                fieldProps={{
                    precision: 0 // 只允许整数
                }}
            />
            <ProFormDigit
                name={['attrs', 'height']}
                label={t('assets.height')}
                fieldProps={{
                    precision: 0 // 只允许整数
                }}
            />
        </>,
    }

    const renderRDPAdvanceView = () => {
        return <>
            <Tabs
                items={[
                    displaySetting,
                    {
                        key: 'audio_settings',
                        label: t('assets.audio_settings'),
                        forceRender: true,
                        children: <>
                            <ProFormSwitch
                                name={["attrs", "disable-audio"]}
                                label={t('assets.disable_audio')}
                            />
                            <ProFormSwitch
                                name={["attrs", "enable-audio-input"]}
                                label={t('assets.enable_audio_input')}
                            />
                        </>,
                    },
                    {
                        key: 'domain',
                        label: t('assets.rdp_domain'),
                        forceRender: true,
                        children: <>
                            <ProFormText name={['attrs', "domain"]}
                                         label={t('assets.rdp_domain')}
                            />
                        </>,
                    },
                    {
                        key: 'PDU',
                        label: 'PDU',
                        forceRender: true,
                        children: <>
                            <ProFormText name={["attrs", "preconnection-id"]}
                                         label={t("assets.preconnection_id")}
                            />
                            <ProFormText name={["attrs", "preconnection-blob"]}
                                         label={t("assets.preconnection_blob")}
                            />
                        </>,
                    },
                    {
                        key: 'remote-app',
                        label: 'Remote App',
                        forceRender: true,
                        children: <>
                            <ProFormText name={["attrs", "remote-app"]}
                                         label={t("assets.remote_app")}
                            />
                            <ProFormText name={["attrs", "remote-app-dir"]}
                                         label={t("assets.remote_app_dir")}
                            />
                            <ProFormText name={["attrs", "remote-app-args"]}
                                         label={t("assets.remote_app_args")}
                            />
                        </>,
                    },
                    {
                        key: 'rdp-drive',
                        label: t('assets.rdp_drive'),
                        forceRender: true,
                        children: <>
                            <ProFormSwitch
                                name={["attrs", "enable-drive"]}
                                checkedChildren={t('general.enabled')}
                                unCheckedChildren={t('general.disabled')}
                                label={t('assets.rdp_enable_drive')}
                            />
                            <ProFormSelect
                                name={["attrs", "drive-path"]}
                                label={t('assets.rdp_drive_path')}
                                extra={t('assets.rdp_drive_path_extra')}
                                request={async () => {
                                    let items = await storageApi.getShares();
                                    return items.map(item => {
                                        return {
                                            label: item.name,
                                            value: item.id,
                                        }
                                    });
                                }}
                            />
                        </>,
                    },
                ]}
            />
        </>
    }

    const renderVNCAdvanceView = () => {
        return <>
            <Tabs
                items={[
                    displaySetting,
                ]}
            />
        </>
    }

    const renderSSHAdvanceView = () => {
        return <>
            <Tabs
                items={[
                    {
                        label: t('assets.socks5-proxy'),
                        key: 'socks5-proxy',
                        forceRender: true,
                        children: <>
                            <ProFormSwitch
                                name={["attrs", "socks5-proxy-enabled"]}
                                label={t('assets.socks5-proxy-enabled')}
                                checkedChildren={t('general.enabled')}
                                unCheckedChildren={t('general.disabled')}
                            />

                            <ProFormDependency name={['attrs', 'socks5-proxy-enabled']}>
                                {({attrs}) => {
                                    if (!attrs) {
                                        attrs = {};
                                    }
                                    return <>
                                        <ProFormText name={['attrs', 'socks5-proxy-host']}
                                                     label={t('assets.socks5-proxy-host')}
                                                     rules={[{required: attrs['socks5-proxy-enabled']}]}
                                        />
                                        <ProFormDigit name={['attrs', 'socks5-proxy-port']}
                                                      label={t('assets.socks5-proxy-port')}
                                                      rules={[{required: attrs['socks5-proxy-enabled']}]}
                                                      fieldProps={{
                                                          min: 1,
                                                          max: 65535,
                                                          precision: 0 // 只允许整数
                                                      }}
                                        />
                                        <ProFormText name={['attrs', 'socks5-proxy-username']}
                                                     label={t('assets.socks5-proxy-username')}
                                        />
                                        <ProFormText name={['attrs', 'socks5-proxy-password']}
                                                     label={t('assets.socks5-proxy-password')}
                                        />
                                    </>
                                }}
                            </ProFormDependency>
                        </>
                    }
                ]}
            >
            </Tabs>
        </>
    }

    const renderAdvancedView = (protocol: string) => {
        switch (protocol) {
            case 'rdp':
                return renderRDPAdvanceView();
            // case 'ssh':
            //     return renderSSHAdvanceView();
            case 'vnc':
                return renderVNCAdvanceView();
        }
    }

    const {token} = theme.useToken();

    const panelStyle: React.CSSProperties = {
        marginBottom: 24,
        background: token.colorFillAlter,
        borderRadius: token.borderRadiusLG,
        border: 'none',
    };

    const beforeUpload = (file: RcFile) => {
        const isTooLarge = file.size / 1024 / 1024;
        if (!isTooLarge) {
            message.error('Image must smaller than 1MB!');
            return false;
        }
        return true;
    };

    const handleUploadRequest = ({file, onSuccess}: any) => {
        //声明js的文件流
        const reader = new FileReader();
        if (file) {
            //通过文件流将文件转换成Base64字符串
            reader.readAsDataURL(file);
            //转换成功后
            reader.onloadend = function () {
                //输出结果
                let logo = reader.result as string;
                setLogo(logo);
            }
        }
    }

    const transformData = (data: TreeDataNode[]) => {
        return data.map(item => {
            const newItem = {
                title: item.title,
                value: item.key as string,
                // key: item.key,
                children: [],
            };
            if (item.children) {
                newItem.children = transformData(item.children);
            }
            return newItem;
        });
    };

    const logoPopover = () => {
        return <div>
            <div className={'grid grid-cols-8 gap-2'}>
                {logosQuery.data?.map(item => {
                    return <div className={'h-10 w-10 rounded-lg cursor-pointer border p-2'}
                                onClick={() => {
                                    setLogo(item.data);
                                }}
                                key={item.name}
                    >
                        <img key={item.name} src={item.data} alt={item.name}/>
                    </div>
                })}

                <div
                    className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-red-500 flex items-center justify-center'}
                    onClick={() => {
                        setLogo('');
                    }}
                >
                    <TrashIcon className={'text-red-500 h-4 w-4'}/>
                </div>

                <Upload
                    maxCount={1}
                    showUploadList={false}
                    customRequest={handleUploadRequest}
                    beforeUpload={beforeUpload}
                >
                    <div
                        className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center'}>
                        <UploadIcon className={'text-blue-500 h-4 w-4'}/>
                    </div>
                </Upload>
            </div>
        </div>
    }

    return (
        <div className="px-4">
            <ProForm {...formItemLayout}
                     formRef={formRef} layout={'horizontal'}
                     request={get} onFinish={wrapSet}
            >
                <ProFormText hidden={true} name={'id'}/>
                <Form.Item name={'logo'} label={t('assets.logo')}>
                    <Popover placement="rightTop" content={logoPopover()}>
                        <div
                            className={'w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer hover:border-blue-500'}>
                            {logo ? <img className={''} src={logo} alt="logo"/> : ''}
                        </div>
                    </Popover>
                </Form.Item>
                <ProFormText name={'name'} label={t('assets.name')} rules={[{required: true}]}/>
                <ProFormSegmented
                    label={t('assets.protocol')} name='protocol' rules={[{required: true}]}
                    valueEnum={{
                        ssh: 'SSH',
                        rdp: 'RDP',
                        vnc: 'VNC',
                        telnet: 'Telnet',
                        // kubernetes: 'Kubernetes',
                        // mysql: 'Mysql',
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
                    {
                        ({protocol}) => renderProtocol(protocol)
                    }
                </ProFormDependency>

                <ProFormSelect
                    label={t('assets.agent_gateway')} name='agentGatewayId'
                    request={async () => {
                        let items = await agentGatewayApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                            }
                        });
                    }}
                />

                <ProFormSelect
                    label={t('assets.ssh_gateway')} name='sshGatewayId'
                    extra={t('assets.gateway_tip')}
                    request={async () => {
                        let items = await sshGatewayApi.getAll();
                        return items.map(item => {
                            return {
                                label: item.name,
                                value: item.id,
                            }
                        });
                    }}
                    showSearch
                />

                <ProFormSelect
                    label={t('assets.tags')} name='tags'
                    fieldProps={{
                        mode: 'tags'
                    }}
                    request={async () => {
                        let tags = await assetsApi.getTags();
                        return tags.map(tag => {
                            return {
                                label: tag,
                                value: tag,
                            }
                        });
                    }}
                    showSearch
                />

                <ProFormTreeSelect
                    name="groupId"
                    label={t('assets.group')}
                    allowClear
                    // secondary
                    request={async () => {
                        let tree = await assetsApi.getGroups();
                        return transformData(tree)
                    }}
                    fieldProps={{
                        treeDefaultExpandAll: true,
                    }}
                />

                <ProFormTextArea label={t('assets.description')} name='description'
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
                            children: <ProFormDependency name={['protocol']}>
                                {
                                    ({protocol}) => {
                                        return renderAdvancedView(protocol);
                                    }
                                }
                            </ProFormDependency>,
                            style: panelStyle,
                        }
                    ]}
                >
                </Collapse>
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

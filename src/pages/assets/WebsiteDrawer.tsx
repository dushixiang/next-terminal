import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, Card, Drawer, Form, message, Popover, Space, Tabs, Upload} from "antd";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDateTimePicker,
    ProFormDependency,
    ProFormDigit,
    ProFormGroup,
    ProFormInstance,
    ProFormList,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import websiteApi from "@/src/api/website-api";
import agentGatewayApi from "@/src/api/agent-gateway-api";
import {EyeIcon, GlobeIcon, LinkIcon, ServerIcon, ShieldIcon, TrashIcon, UploadIcon} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import assetsApi from "@/src/api/asset-api";
import {RcFile} from "antd/es/upload";
import dayjs from "dayjs";
import certificateApi from "@/src/api/certificate-api";
import WebsiteModifyResponseView from "@/src/pages/assets/WebsiteModifyResponseView";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const api = websiteApi;

export interface WebsiteDrawerProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
    id?: string
}

function parseURL(url: string) {
    const parsedURL = new URL(url);

    const scheme = parsedURL.protocol.replace(':', ''); // 移除末尾的冒号
    const host = parsedURL.hostname;
    const port = parsedURL.port || (scheme === 'http' ? '80' : scheme === 'https' ? '443' : '');

    return {scheme, host, port};
}

const WebsiteDrawer = ({
                           open,
                           onClose,
                           onSuccess,
                           id,
                       }: WebsiteDrawerProps) => {

    let {t} = useTranslation();
    let [timeLimit, setTimeLimit] = useState(false);
    let [expiredAt, setExpiredAt] = useState<dayjs.Dayjs>();
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [license] = useLicense();

    const formRef = useRef<ProFormInstance>();
    let logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    let [logo, setLogo] = useState<string>();

    useEffect(() => {
        if (!open) {
            setLogo(undefined);
        }
    }, [open]);

    const get = async () => {
        if (id) {
            let website = await api.getById(id);
            let {scheme, host, port} = parseURL(website.targetUrl);
            website.scheme = scheme;
            website.host = host;
            website.port = parseInt(port, 10);
            setLogo(website.logo);

            if (website.public.expiredAt > 0) {
                let d = dayjs(website.public.expiredAt);
                setExpiredAt(d);
            }

            setTimeLimit(website.public.expiredAt > 0);
            return website;
        }
        return {
            enabled: true,
            scheme: 'http',
            cert: {
                enabled: false,
            },
            public: {
                enabled: false,
                expiredAt: 0,
            }
        };
    }

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

    const handleOk = async (values: any) => {
        setConfirmLoading(true);
        try {
            values['targetUrl'] = `${values['scheme']}://${values['host']}:${values['port']}`;
            values['logo'] = logo;
            if (timeLimit) {
                values['public']['expiredAt'] = expiredAt?.valueOf();
            }

            if (id) {
                await api.updateById(id, values);
            } else {
                await api.create(values);
            }

            message.success(t('general.success'));
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setConfirmLoading(false);
        }
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

    const BasicView = () => {
        return <div className="space-y-6">
            {/* 网站信息区域 */}
            <div className="space-y-4">
                <div className={'flex items-start gap-2 h-24'}>
                    <Form.Item name="logo" label={t('assets.logo')}>
                        <Popover
                            placement="bottomRight"
                            content={logoPopover()}
                            trigger="click"
                        >
                            <div
                                className={'w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer border-blue-200 dark:border-blue-700 hover:border-blue-500'}>
                                {logo ? <img className={''} src={logo} alt="logo"/> : ''}
                            </div>
                        </Popover>
                    </Form.Item>
                    <ProFormSwitch
                        label={t('general.enabled')}
                        name="enabled"
                        rules={[{required: true}]}
                        fieldProps={{
                            checkedChildren: t('general.yes'),
                            unCheckedChildren: t('general.no'),
                        }}
                    />
                </div>
                <ProFormText
                    label={t('assets.name')}
                    name="name"
                    rules={[{required: true}]}
                />
                <ProFormText
                    label={t('assets.domain')}
                    name="domain"
                    rules={[{required: true}]}
                    extra={t('assets.domain_tip')}
                    placeholder="example.com"
                />
                <ProFormText
                    label={t('assets.entrance')}
                    required={false}
                    name="entrance"
                    style={{width: '100%'}}
                    extra={t('assets.entrance_tip')}
                    placeholder="/admin"
                />
            </div>

            {/* 目标服务器区域 */}
            <Card size="small" className="border-gray-200">
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <ServerIcon className="h-4 w-4 text-gray-600"/>
                        <span className="text-sm font-medium text-gray-700">{t('assets.target_server')}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ProFormSelect
                        label={t('assets.scheme')}
                        name="scheme"
                        options={[
                            {value: 'http', label: 'HTTP'},
                            {value: 'https', label: 'HTTPS'},
                        ]}
                        required={true}
                        rules={[{required: true}]}
                        className="w-24"
                    />
                    <div className="flex-grow">
                        <ProFormText
                            label={t('assets.forward_host_or_ip')}
                            required={true}
                            name="host"
                            style={{width: '100%'}}
                            rules={[{required: true}]}
                            placeholder="192.168.1.100"
                        />
                    </div>
                    <ProFormDigit
                        name="port"
                        label={t('assets.forward_port')}
                        required={true}
                        min={1}
                        max={65535}
                        width={120}
                        fieldProps={{
                            precision: 0
                        }}
                        placeholder="80"
                        rules={[{required: true}]}
                    />
                </div>
            </Card>

            <ProFormSelect
                label={t('assets.agent_gateway')}
                name="agentGatewayId"
                request={async () => {
                    let items2 = await agentGatewayApi.getAll();
                    return items2.map(item => {
                        return {
                            label: item.name,
                            value: item.id,
                        }
                    });
                }}
            />
        </div>
    }

    const HeaderView = () => {
        return <div className="space-y-4">
            <ProFormCheckbox
                name="preserveHost"
                label={t('assets.preserve_host')}
                extra={t('assets.preserve_host_tip')}
            />
            <ProFormList
                name="headers"
                label={t('assets.custom_header')}
                initialValue={[]}
                tooltip={t('assets.custom_header_tip')}
                itemRender={({listDom, action}) => (
                    <Card size="small" className="mb-2">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">{listDom}</div>
                            <div>{action}</div>
                        </div>
                    </Card>
                )}
            >
                <ProFormGroup key="group">
                    <ProFormText
                        name="name"
                        label={t('assets.header_key')}
                        placeholder="Content-Type"
                    />
                    <ProFormText
                        name="value"
                        label={t('assets.header_value')}
                        placeholder="application/json"
                    />
                </ProFormGroup>
            </ProFormList>
        </div>
    }

    const BasicAuthView = () => {
        return <div className="space-y-4">
            <ProFormSwitch
                label={t('assets.basic_auth_enabled')}
                name={['basicAuth', 'enabled']}
                fieldProps={{
                    checkedChildren: t('general.yes'),
                    unCheckedChildren: t('general.no'),
                }}
            />
            <ProFormDependency name={['basicAuth', 'enabled']}>
                {({basicAuth}) => {
                    if (!basicAuth?.enabled) return null;
                    return <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                        <ProFormText
                            label={t('assets.basic_auth_username')}
                            name={['basicAuth', 'username']}
                            rules={[{required: true}]}
                            placeholder="admin"
                        />
                        <ProFormText
                            label={t('assets.basic_auth_password')}
                            name={['basicAuth', 'password']}
                            rules={[{required: true}]}
                            placeholder="password"
                        />
                    </div>
                }}
            </ProFormDependency>
        </div>
    }

    const CertView = () => {
        return <div className="space-y-4">
            <ProFormSwitch
                label={t('general.enabled')}
                name={['cert', 'enabled']}
                fieldProps={{
                    checkedChildren: t('general.yes'),
                    unCheckedChildren: t('general.no'),
                }}
            />
            <ProFormDependency name={['cert', 'enabled']}>
                {({cert}) => {
                    if (!cert?.enabled) return null;
                    return <div className="pl-4 border-l-2 border-green-500">
                        <ProFormSelect
                            label={t('assets.cert')}
                            name={['cert', 'certId']}
                            rules={[{required: true}]}
                            request={async () => {
                                let certificates = await certificateApi.getAll();
                                return certificates.map(item => {
                                    return {
                                        label: item.commonName,
                                        value: item.id,
                                    }
                                })
                            }}
                            placeholder={t('assets.select_cert')}
                        />
                    </div>
                }}
            </ProFormDependency>
        </div>
    }

    const PublicView = () => {
        return <div className="space-y-4">
            <Alert
                type="warning"
                message={t('assets.public_tip')}
                showIcon
                className="mb-4"
            />
            <ProFormSwitch
                label={t('general.enabled')}
                name={['public', 'enabled']}
                fieldProps={{
                    checkedChildren: t('general.yes'),
                    unCheckedChildren: t('general.no'),
                }}
            />

            <ProFormDependency name={['public', 'enabled']}>
                {(values) => {
                    if (!values?.public?.enabled) return null;
                    return <div className="space-y-4 pl-4 border-l-2 border-orange-500">
                        <ProFormTextArea
                            label={t('assets.limit_ip')}
                            name={['public', 'ip']}
                            extra={t('assets.limit_ip_tip')}
                            placeholder="192.168.1.0/24"
                            fieldProps={{rows: 3}}
                        />

                        <Card size="small" className="border-gray-200">
                            <div className="flex items-center gap-4">
                                <ProFormCheckbox
                                    label={t('assets.limit_time_enabled')}
                                    name={['public', 'timeLimit']}
                                    valuePropName="checked"
                                    fieldProps={{
                                        checked: timeLimit,
                                        onChange: (e) => {
                                            setTimeLimit(e.target.checked);
                                        }
                                    }}
                                />
                                {timeLimit && <ProFormDateTimePicker
                                    label={t('assets.limit_time')}
                                    name={['public', 'expiredAt']}
                                    fieldProps={{
                                        allowClear: true,
                                        disabledDate: (current) => {
                                            return current && current < dayjs();
                                        },
                                        value: expiredAt,
                                        onChange: (date, dateString) => {
                                            setExpiredAt(date);
                                        }
                                    }}
                                />}
                            </div>
                        </Card>

                        <ProFormText
                            label={t('assets.limit_password')}
                            name={['public', 'password']}
                            extra={t('assets.limit_password_tip')}
                            placeholder="password123"
                        />
                    </div>
                }}
            </ProFormDependency>
        </div>
    }

    const items = [
        {
            key: 'general',
            label: (
                <div className="flex items-center gap-2">
                    <GlobeIcon className="h-4 w-4"/>
                    <span>{t('assets.general')}</span>
                </div>
            ),
            children: <BasicView/>,
            forceRender: true,
        },
        // {
        //     key: 'basic-auth',
        //     label: (
        //         <div className="flex items-center gap-2">
        //             <KeyIcon className="h-4 w-4"/>
        //             <span>{t('assets.basic_auth')}</span>
        //         </div>
        //     ),
        //     children: <BasicAuthView/>,
        //     forceRender: true,
        // },
        {
            key: 'headers',
            label: (
                <div className="flex items-center gap-2">
                    <ServerIcon className="h-4 w-4"/>
                    <span>{t('assets.custom_header')}</span>
                </div>
            ),
            children: <HeaderView/>,
            forceRender: true,
        },
        {
            key: 'cert',
            label: (
                <div className="flex items-center gap-2">
                    <ShieldIcon className="h-4 w-4"/>
                    <span>{t('assets.custom_certificate')}</span>
                </div>
            ),
            children: <CertView/>,
            forceRender: true,
        },
        {
            key: 'modify-response',
            label: (
                <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4"/>
                    <span>{t('assets.modify_response')}</span>
                </div>
            ),
            children: <Disabled disabled={license.isFree()}>
                <WebsiteModifyResponseView/>
            </Disabled>,
            forceRender: true,
        },
        {
            key: 'public',
            label: (
                <div className="flex items-center gap-2">
                    <EyeIcon className="h-4 w-4"/>
                    <span>{t('assets.public')}</span>
                </div>
            ),
            children: <PublicView/>,
            forceRender: true,
        },
    ]

    return (
        <Drawer
            title={
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <GlobeIcon className="h-5 w-5 text-blue-500"/>
                        <span className="text-lg font-medium">
                            {id ? t('actions.edit') : t('actions.new')}
                        </span>
                    </div>
                    {!id && (
                        <Alert
                            banner
                            closable
                            message={t('assets.website_tip')}
                            type="info"
                            className="flex-1"
                        />
                    )}
                </div>
            }
            onClose={onClose}
            open={open}
            width={Math.min(window.innerWidth - 200, 1200)}
            className="website-drawer"
            destroyOnHidden={true}
            extra={
                <Space>
                    <Button onClick={onClose} className="border-gray-300">
                        {t('actions.cancel')}
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => {
                            formRef.current?.validateFields().then(handleOk);
                        }}
                        loading={confirmLoading}
                        className="bg-blue-500 hover:bg-blue-600"
                    >
                        {t('actions.save')}
                    </Button>
                </Space>
            }
        >
            <div className="h-full">
                <ProForm formRef={formRef} request={get} submitter={false}>
                    <ProFormText hidden={true} name="id"/>
                    <Tabs
                        items={items}
                        defaultActiveKey="general"
                        type="card"
                        className="h-full"
                    />
                </ProForm>
            </div>
        </Drawer>
    )
};

export default WebsiteDrawer;
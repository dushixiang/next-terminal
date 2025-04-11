import React, {useRef, useState} from 'react';
import {Alert, Form, message, Modal, Popover, Tabs, Upload} from "antd";
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
import {TrashIcon, UploadIcon} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import assetsApi from "@/src/api/asset-api";
import {RcFile} from "antd/es/upload";
import dayjs from "dayjs";

const api = websiteApi;

export interface SnippetProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

function parseURL(url: string) {
    const parsedURL = new URL(url);

    const scheme = parsedURL.protocol.replace(':', ''); // 移除末尾的冒号
    const host = parsedURL.hostname;
    const port = parsedURL.port || (scheme === 'http' ? '80' : scheme === 'https' ? '443' : '');

    return {scheme, host, port};
}

const WebsiteModal = ({
                          open,
                          handleOk,
                          handleCancel,
                          confirmLoading,
                          id,
                      }: SnippetProps) => {

    let {t} = useTranslation();
    let [timeLimit, setTimeLimit] = useState(false);
    let [expiredAt, setExpiredAt] = useState<dayjs.Dayjs>();

    const formRef = useRef<ProFormInstance>();
    let logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    let [logo, setLogo] = useState<string>();

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
        return <>
            <ProFormText label={t('assets.name')} name="name" rules={[{required: true}]}/>
            <ProFormText label={t('assets.domain')}
                         name="domain"
                         rules={[{required: true}]}
                         extra={t('assets.domain_tip')}
            />
            <ProFormText
                label={t('assets.entrance')}
                required={false}
                name={'entrance'}
                style={{
                    width: '100%',
                }}
                // rules={[{required: true}]}
                // extra={'The entrance is the path that the user will enter the website.'}
                extra={t('assets.entrance_tip')}
            />

            {/*<ProFormText label={t('target-url')} name="targetUrl" rules={[{required: true}]}/>*/}
            <div className={'flex gap-2'}>
                <ProFormSelect
                    label={t('assets.scheme')}
                    name={'scheme'}
                    options={[
                        {value: 'http', label: 'http'},
                        {value: 'https', label: 'https'},
                    ]}
                    required={true}
                    rules={[{required: true}]}
                />
                <div className={'flex-grow'}>
                    <ProFormText
                        label={t('assets.forward_host_or_ip')}
                        required={true}
                        name={'host'}
                        style={{
                            width: '100%',
                        }}
                        rules={[{required: true}]}
                    />
                </div>

                <ProFormDigit
                    name={'port'}
                    label={t('assets.forward_port')}
                    required={true}
                    min={1}
                    max={65535}
                    width={120}
                    fieldProps={{
                        precision: 0 // 只允许整数
                    }}
                    placeholder={'80'}
                    rules={[{required: true}]}
                />
            </div>

            <ProFormSelect
                label={t('assets.agent_gateway')} name='agentGatewayId'
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
        </>
    }

    const HeaderView = () => {
        return <div>
            <ProFormList
                name="headers"
                label={t('assets.custom_header')}
                initialValue={[]}
                tooltip={''}
            >
                <ProFormGroup key="group">
                    <ProFormText name="name" label={t('assets.header_key')}/>
                    <ProFormText name="value" label={t('assets.header_value')}/>
                </ProFormGroup>
            </ProFormList>
        </div>
    }

    const BasicAuthView = () => {
        return <>
            <ProFormSwitch label={t('assets.basic_auth_enabled')} name={['basicAuth', 'enabled']}
                           fieldProps={{
                               checkedChildren: t('general.yes'),
                               unCheckedChildren: t('general.no'),
                           }}
            />
            <ProFormText label={t('assets.basic_auth_username')} name={['basicAuth', 'username']}/>
            <ProFormText label={t('assets.basic_auth_password')} name={['basicAuth', 'password']}/>
        </>
    }

    const CertView = () => {
        return <>
            <ProFormSwitch label={t('general.enabled')} name={['cert', 'enabled']}
                           fieldProps={{
                               checkedChildren: t('general.yes'),
                               unCheckedChildren: t('general.no'),
                           }}
            />
            <ProFormDependency name={['cert', 'enabled']}>
                {({cert}) => {
                    return <>
                        <ProFormTextArea label={t('settings.rp.cert')} name={['cert', 'cert']}
                                         disabled={!cert['enabled']}/>
                        <ProFormTextArea label={t('settings.rp.cert_key')} name={['cert', 'key']}
                                         disabled={!cert['enabled']}/>
                    </>
                }}
            </ProFormDependency>
        </>
    }

    const PublicView = () => {
        return <>
            <ProFormSwitch label={t('general.enabled')} name={['public', 'enabled']}
                           fieldProps={{
                               checkedChildren: t('general.yes'),
                               unCheckedChildren: t('general.no'),
                           }}
            />

            <ProFormDependency name={['public', 'enabled']}>
                {(values) => {
                    return <>
                        <ProFormTextArea label={t('assets.limit_ip')} name={['public', 'ip']}
                                         extra={t('assets.limit_ip_tip')}
                                         disabled={!values['public']['enabled']}
                        />

                        <div className={'flex items-center gap-4'}>
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
                                disabled={!values['public']['enabled']}
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
                                disabled={!values['public']['enabled']}
                            />}
                        </div>

                        <ProFormText label={t('assets.limit_password')} name={['public', 'password']}
                                     extra={t('assets.limit_password_tip')}
                                     disabled={!values['public']['enabled']}
                        />
                    </>
                }}
            </ProFormDependency>

        </>
    }

    const items = [
        {
            key: 'general',
            label: t('assets.general'),
            children: <BasicView/>,
            forceRender: true,
        },
        {
            key: 'headers',
            label: t('assets.header'),
            children: <HeaderView/>,
            forceRender: true,
        },
        {
            key: 'basic-auth',
            label: t('assets.basic_auth'),
            children: <BasicAuthView/>,
            forceRender: true,
        },
        {
            key: 'cert',
            label: t('assets.cert'),
            children: <CertView/>,
            forceRender: true,
        },
        {
            key: 'public',
            label: t('assets.public'),
            children: <PublicView/>,
            forceRender: true,
        },
    ]

    return (
        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            width={800}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        values['targetUrl'] = `${values['scheme']}://${values['host']}:${values['port']}`;
                        values['logo'] = logo;
                        if (timeLimit) {
                            values['public']['expiredAt'] = expiredAt?.valueOf();
                        }
                        handleOk(values);
                        formRef.current?.resetFields();
                    });
            }}
            onCancel={() => {
                formRef.current?.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <div className={'mb-4'}>
                <Alert banner closable message={t('assets.website_tip')}/>
            </div>
            <ProForm formRef={formRef} request={get} submitter={false}>
                <div className={'flex gap-4'}>
                    <div className={'w-[90px] flex-shrink-0 border p-4 rounded-lg'}>
                        <ProFormText hidden={true} name={'id'}/>
                        <ProFormSwitch label={t('general.enabled')} name={'enabled'} rules={[{required: true}]}
                                       fieldProps={{
                                           checkedChildren: t('general.yes'),
                                           unCheckedChildren: t('general.no'),
                                       }}
                        />
                        <Form.Item name={'logo'} label={t('assets.logo')}>
                            <Popover placement="rightTop" content={logoPopover()}>
                                <div
                                    className={'w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer border-blue-200 dark:border-blue-700 hover:border-blue-500'}>
                                    {logo ? <img className={''} src={logo} alt="logo"/> : ''}
                                </div>
                            </Popover>
                        </Form.Item>
                    </div>
                    <div className={'flex-grow'}>
                        <Tabs
                            items={items}
                            defaultActiveKey={'basic'}
                        />
                    </div>
                </div>
            </ProForm>
        </Modal>
    )
};

export default WebsiteModal;
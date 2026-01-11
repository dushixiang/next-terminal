import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, message, Popover, Space, Tabs, Upload } from "antd";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDateTimePicker,
    ProFormDependency,
    ProFormDigit,
    ProFormGroup,
    ProFormInstance,
    ProFormList,
    ProFormRadio,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea,
    ProFormTreeSelect
} from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RcFile } from "antd/es/upload";
import dayjs, { Dayjs } from "dayjs";
import { ServerIcon, TrashIcon, UploadIcon } from "lucide-react";

import websiteApi from "@/api/website-api";
import agentGatewayApi from "@/api/agent-gateway-api";
import sshGatewayApi from "@/api/ssh-gateway-api";
import gatewayGroupApi from "@/api/gateway-group-api";
import assetsApi from "@/api/asset-api";
import certificateApi from "@/api/certificate-api";
import WebsiteModifyResponseView from "@/pages/assets/WebsiteModifyResponseView";
import { useLicense } from "@/hook/LicenseContext";
import Disabled from "@/components/Disabled";

// ==================== 常量定义 ====================
const DEFAULT_HTTP_PORT = '80';
const DEFAULT_HTTPS_PORT = '443';
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const DEFAULT_DRAWER_WIDTH = 1200;
const MIN_DRAWER_MARGIN = 200;

// ==================== 类型定义 ====================
export interface WebsiteDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    id?: string;
}

interface ParsedURL {
    scheme: string;
    host: string;
    port: string;
}

interface WebsiteFormData {
    id?: string;
    name: string;
    domain: string;
    entrance?: string;
    enabled: boolean;
    scheme: string;
    host: string;
    port: number;
    targetUrl: string;
    logo?: string;
    groupId?: string;
    gatewayId?: string;
    preserveHost?: boolean;
    disableAccessLog?: boolean;
    headers?: Array<{ name: string; value: string }>;
    basicAuth?: {
        enabled: boolean;
        username?: string;
        password?: string;
    };
    cert?: {
        enabled: boolean;
        certId?: string;
    };
    public?: {
        enabled: boolean;
        expiredAt?: number;
        ip?: string;
        password?: string;
        timeLimit?: boolean;
    };
}

interface LogoItem {
    name: string;
    data: string;
}

// ==================== 工具函数 ====================
/**
 * 解析URL并提取协议、主机和端口信息
 * @param url - 要解析的URL字符串
 * @returns 包含协议、主机和端口的对象
 */
const parseURL = (url: string): ParsedURL => {
    const parsedURL = new URL(url);
    const scheme = parsedURL.protocol.replace(':', '');
    const host = parsedURL.hostname;
    const port = parsedURL.port || (scheme === 'http' ? DEFAULT_HTTP_PORT : scheme === 'https' ? DEFAULT_HTTPS_PORT : '');
    
    return { scheme, host, port };
};

/**
 * 验证上传文件大小
 * @param file - 要验证的文件
 * @returns 是否通过验证
 */
const validateFileSize = (file: RcFile): boolean => {
    if (file.size > MAX_FILE_SIZE) {
        message.error('Image must be smaller than 1MB!');
        return false;
    }
    return true;
};

// ==================== 自定义Hook ====================
/**
 * 网站表单状态管理Hook
 * @param id - 网站ID（编辑模式时使用）
 * @returns 表单状态和操作函数
 */
const useWebsiteForm = (id?: string) => {
    const [timeLimit, setTimeLimit] = useState(false);
    const [expiredAt, setExpiredAt] = useState<Dayjs>();
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [logo, setLogo] = useState<string>();

    // 使用useCallback优化重置函数
    const resetForm = useCallback(() => {
        setLogo(undefined);
        setTimeLimit(false);
        setExpiredAt(undefined);
        setConfirmLoading(false);
    }, []);

    // 优化数据加载函数，添加错误处理
    const loadWebsiteData = useCallback(async (): Promise<Partial<WebsiteFormData>> => {
        if (!id) {
            return {
                enabled: true,
                scheme: 'http',
                cert: { enabled: false },
                public: { enabled: false, expiredAt: 0 },
            };
        }

        try {
            const website = await websiteApi.getById(id);
            const { scheme, host, port } = parseURL(website.targetUrl);
            
            const formData: Partial<WebsiteFormData> = {
                ...website,
                scheme,
                host,
                port: parseInt(port, 10),
            };

            // 批量更新状态以减少重渲染
            setLogo(website.logo);

            if (website.public?.expiredAt && website.public.expiredAt > 0) {
                const date = dayjs(website.public.expiredAt);
                setExpiredAt(date);
                setTimeLimit(true);
            } else {
                setExpiredAt(undefined);
                setTimeLimit(false);
            }

            return formData;
        } catch (error) {
            console.error('Failed to load website data:', error);
            message.error('加载网站数据失败');
            throw error;
        }
    }, [id]);

    // 优化时间限制处理函数
    const handleTimeLimitChange = useCallback((checked: boolean) => {
        setTimeLimit(checked);
        if (!checked) {
            setExpiredAt(undefined);
        }
    }, []);

    // 优化过期时间处理函数
    const handleExpiredAtChange = useCallback((date: Dayjs | null) => {
        setExpiredAt(date || undefined);
    }, []);

    return {
        timeLimit,
        setTimeLimit: handleTimeLimitChange,
        expiredAt,
        setExpiredAt: handleExpiredAtChange,
        confirmLoading,
        setConfirmLoading,
        logo,
        setLogo,
        resetForm,
        loadWebsiteData,
    };
};

// Sub-components
const LogoSelector: React.FC<{
    logo?: string;
    onLogoChange: (logo: string) => void;
    logosData?: LogoItem[];
}> = React.memo(({ logo, onLogoChange, logosData }) => {
    const { t } = useTranslation();

    const handleUploadRequest = useCallback(({ file, onSuccess }: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            onLogoChange(result);
            onSuccess?.(result);
        };
        reader.readAsDataURL(file);
    }, [onLogoChange]);

    const logoPopoverContent = useMemo(() => (
        <div className="grid grid-cols-8 gap-2">
            {logosData?.map(item => (
                <div
                    key={item.name}
                    className="h-10 w-10 rounded-lg cursor-pointer border p-2 hover:border-blue-500"
                    onClick={() => onLogoChange(item.data)}
                >
                    <img src={item.data} alt={item.name} className="w-full h-full object-contain" />
                </div>
            ))}
            
            <div
                className="h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-red-500 flex items-center justify-center hover:bg-red-50"
                onClick={() => onLogoChange('')}
            >
                <TrashIcon className="text-red-500 h-4 w-4" />
            </div>

            <Upload
                maxCount={1}
                showUploadList={false}
                customRequest={handleUploadRequest}
                beforeUpload={validateFileSize}
            >
                <div className="h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center hover:bg-blue-50">
                    <UploadIcon className="text-blue-500 h-4 w-4" />
                </div>
            </Upload>
        </div>
    ), [logosData, onLogoChange, handleUploadRequest]);

    return (
        <Form.Item name="logo" label={t('assets.logo')}>
            <Popover
                placement="bottomRight"
                content={logoPopoverContent}
                trigger="click"
            >
                <div className="w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer border-blue-200 dark:border-blue-700 hover:border-blue-500">
                    {logo && <img src={logo} alt="logo" className="w-full h-full object-contain" />}
                </div>
            </Popover>
        </Form.Item>
    );
});

const BasicView: React.FC<{
    logo?: string;
    onLogoChange: (logo: string) => void;
    logosData?: LogoItem[];
}> = React.memo(({ logo, onLogoChange, logosData }) => {
    const { t } = useTranslation();

    const schemeOptions = useMemo(() => [
        { value: 'http', label: 'HTTP' },
        { value: 'https', label: 'HTTPS' },
    ], []);

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
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

    const transformGroupData = useCallback((data: any[]): any[] => {
        return data.map(item => ({
            title: item.title,
            value: item.key as string,
            children: item.children ? transformGroupData(item.children) : [],
        }));
    }, []);

    const groupsRequest = useCallback(async () => {
        const groups = await websiteApi.getGroups();
        return transformGroupData(groups);
    }, [transformGroupData]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-start gap-6 p-4 bg-gray-50 dark:bg-[#141414] rounded-lg border">
                    <div className="flex-shrink-0">
                        <LogoSelector
                            logo={logo}
                            onLogoChange={onLogoChange}
                            logosData={logosData}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <ProFormSwitch
                            label={t('general.enabled')}
                            name="enabled"
                            rules={[{ required: true }]}
                            fieldProps={{
                                checkedChildren: t('general.yes'),
                                unCheckedChildren: t('general.no'),
                            }}
                        />
                        <ProFormSwitch
                            label={t('assets.disable_access_log')}
                            name="disableAccessLog"
                            tooltip={t('assets.disable_access_log_tip')}
                            fieldProps={{
                                checkedChildren: t('general.yes'),
                                unCheckedChildren: t('general.no'),
                            }}
                        />
                    </div>
                </div>
                
                <ProFormText
                    label={t('assets.name')}
                    name="name"
                    rules={[{ required: true }]}
                    placeholder={t('assets.name')}
                />

                <ProFormTreeSelect
                    label={t('websites.group')}
                    name="groupId"
                    request={groupsRequest}
                    placeholder={t('websites.group_name_placeholder')}
                    fieldProps={{
                        treeDefaultExpandAll: true,
                        allowClear: true,
                        showSearch: true,
                        treeNodeFilterProp: 'title',
                    }}
                />
                
                <ProFormText
                    label={t('assets.domain')}
                    name="domain"
                    rules={[{ required: true }]}
                    extra={t('assets.domain_tip')}
                    placeholder="example.com"
                />
                
                <ProFormText
                    label={t('assets.entrance')}
                    name="entrance"
                    extra={t('assets.entrance_tip')}
                    placeholder="/admin"
                />
            </div>

            <Card size="small" className="border-gray-200 bg-gray-50">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <ServerIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">
                            {t('assets.target_server')}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-2">
                            <ProFormSelect
                                label={t('assets.scheme')}
                                name="scheme"
                                options={schemeOptions}
                                rules={[{ required: true }]}
                            />
                        </div>
                        
                        <div className="md:col-span-7">
                            <ProFormText
                                label={t('assets.forward_host_or_ip')}
                                name="host"
                                rules={[{ required: true }]}
                                placeholder="192.168.1.100"
                            />
                        </div>
                        
                        <div className="md:col-span-3">
                            <ProFormDigit
                                name="port"
                                label={t('assets.forward_port')}
                                min={1}
                                max={65535}
                                fieldProps={{ precision: 0 }}
                                placeholder="80"
                                rules={[{ required: true }]}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <ProFormRadio.Group
                label={t('assets.gateway_type')}
                name='gatewayType'
                options={[
                    {label: t('assets.no_gateway'), value: ''},
                    {label: t('assets.ssh_gateway'), value: 'ssh'},
                    {label: t('assets.agent_gateway'), value: 'agent'},
                    {label: t('assets.gateway_group'), value: 'group'},
                ]}
            />

            <ProFormDependency name={['gatewayType']}>
                {({gatewayType}) => {
                    if (gatewayType === 'ssh') {
                        return (
                            <ProFormSelect
                                key="ssh"
                                label={t('assets.ssh_gateway')}
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
                                label={t('assets.agent_gateway')}
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
                                label={t('assets.gateway_group')}
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
        </div>
    );
});

const HeaderView: React.FC = React.memo(() => {
    const { t } = useTranslation();

    const headerItemRender = useCallback(({ listDom, action }: any) => (
        <Card size="small" className="mb-3 border-gray-200">
            <div className="flex items-center gap-2">
                <div className="flex-1">{listDom}</div>
                <div className="flex-shrink-0">{action}</div>
            </div>
        </Card>
    ), []);

    return (
        <div className="space-y-6">
            <Card size="small" className="border-gray-200 bg-blue-50">
                <ProFormCheckbox
                    name="preserveHost"
                    label={t('assets.preserve_host')}
                    extra={t('assets.preserve_host_tip')}
                />
            </Card>
            
            <div>
                <ProFormList
                    name="headers"
                    label={t('assets.custom_header')}
                    initialValue={[]}
                    tooltip={t('assets.custom_header_tip')}
                    itemRender={headerItemRender}
                >
                    <ProFormGroup key="group">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        </div>
                    </ProFormGroup>
                </ProFormList>
            </div>
        </div>
    );
});

const BasicAuthView: React.FC = React.memo(() => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <Card size="small" className="border-gray-200 bg-yellow-50">
                <ProFormSwitch
                    label={t('assets.basic_auth_enabled')}
                    name={['basicAuth', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
            </Card>
            
            <ProFormDependency name={['basicAuth', 'enabled']}>
                {({ basicAuth }) => {
                    if (!basicAuth?.enabled) return null;
                    
                    return (
                        <Card size="small" className="border-orange-200 bg-orange-50">
                            <div className="space-y-4">
                                <ProFormText
                                    label={t('assets.basic_auth_username')}
                                    name={['basicAuth', 'username']}
                                    rules={[{ required: true }]}
                                    placeholder="admin"
                                />
                                <ProFormText.Password
                                    label={t('assets.basic_auth_password')}
                                    name={['basicAuth', 'password']}
                                    rules={[{ required: true }]}
                                    placeholder="password"
                                />
                            </div>
                        </Card>
                    );
                }}
            </ProFormDependency>
        </div>
    );
});

const CertView: React.FC = React.memo(() => {
    const { t } = useTranslation();

    const certificateRequest = useCallback(async () => {
        const certificates = await certificateApi.getAll();
        return certificates.map(item => ({
            label: item.commonName,
            value: item.id,
        }));
    }, []);

    return (
        <div className="space-y-6">
            <Card size="small" className="border-gray-200 bg-green-50">
                <ProFormSwitch
                    label={t('general.enabled')}
                    name={['cert', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
            </Card>
            
            <ProFormDependency name={['cert', 'enabled']}>
                {({ cert }) => {
                    if (!cert?.enabled) return null;
                    
                    return (
                        <Card size="small" className="border-green-200 bg-green-50">
                            <ProFormSelect
                                label={t('assets.cert')}
                                name={['cert', 'certId']}
                                rules={[{ required: true }]}
                                request={certificateRequest}
                                placeholder={t('assets.cert')}
                                showSearch
                            />
                        </Card>
                    );
                }}
            </ProFormDependency>
        </div>
    );
});

const PublicView: React.FC<{
    timeLimit: boolean;
    onTimeLimitChange: (checked: boolean) => void;
    expiredAt?: Dayjs;
    onExpiredAtChange: (date: Dayjs | null) => void;
}> = React.memo(({ timeLimit, onTimeLimitChange, expiredAt, onExpiredAtChange }) => {
    const { t } = useTranslation();

    const disabledDate = useCallback((current: Dayjs) => {
        return current && current < dayjs();
    }, []);

    return (
        <div className="space-y-6">
            <Alert
                type="warning"
                message={t('assets.public_tip')}
                showIcon
                className="mb-4"
            />
            
            <Card size="small" className="border-gray-200 bg-orange-50">
                <ProFormSwitch
                    label={t('general.enabled')}
                    name={['public', 'enabled']}
                    fieldProps={{
                        checkedChildren: t('general.yes'),
                        unCheckedChildren: t('general.no'),
                    }}
                />
            </Card>

            <ProFormDependency name={['public', 'enabled']}>
                {(values) => {
                    if (!values?.public?.enabled) return null;
                    
                    return (
                        <div className="space-y-6">
                            <Card size="small" className="border-orange-200 bg-orange-50">
                                <ProFormTextArea
                                    label={t('assets.limit_ip')}
                                    name={['public', 'ip']}
                                    extra={t('assets.limit_ip_tip')}
                                    placeholder="192.168.1.0/24"
                                    fieldProps={{ rows: 3 }}
                                />
                            </Card>

                            <Card size="small" className="border-purple-200 bg-purple-50">
                                <div className="space-y-4">
                                    <ProFormCheckbox
                                        label={t('assets.limit_time_enabled')}
                                        name={['public', 'timeLimit']}
                                        valuePropName="checked"
                                        fieldProps={{
                                            checked: timeLimit,
                                            onChange: (e) => onTimeLimitChange(e.target.checked),
                                        }}
                                    />
                                    
                                    {timeLimit && (
                                        <ProFormDateTimePicker
                                            label={t('assets.limit_time')}
                                            name={['public', 'expiredAt']}
                                            fieldProps={{
                                                allowClear: true,
                                                disabledDate,
                                                value: expiredAt,
                                                onChange: onExpiredAtChange,
                                            }}
                                        />
                                    )}
                                </div>
                            </Card>

                            <Card size="small" className="border-red-200 bg-red-50">
                                <ProFormText.Password
                                    label={t('assets.limit_password')}
                                    name={['public', 'password']}
                                    extra={t('assets.limit_password_tip')}
                                    placeholder="password123"
                                />
                            </Card>
                        </div>
                    );
                }}
            </ProFormDependency>
        </div>
    );
});

// Main component
const WebsiteDrawer: React.FC<WebsiteDrawerProps> = ({
    open,
    onClose,
    onSuccess,
    id,
}) => {
    const { t } = useTranslation();
    const { license } = useLicense();
    const formRef = useRef<ProFormInstance>(null);

    const {
        timeLimit,
        setTimeLimit,
        expiredAt,
        setExpiredAt,
        confirmLoading,
        setConfirmLoading,
        logo,
        setLogo,
        resetForm,
        loadWebsiteData,
    } = useWebsiteForm(id);

    const logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    // Reset form when drawer closes
    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open, resetForm]);

    const handleSubmit = useCallback(async (values: WebsiteFormData) => {
        setConfirmLoading(true);
        
        try {
            const submitData: any = {
                ...values,
                targetUrl: `${values.scheme}://${values.host}:${values.port}`,
                logo,
            };

            if (timeLimit && expiredAt) {
                submitData.public = {
                    ...submitData.public,
                    expiredAt: expiredAt.valueOf(),
                };
            }

            if (id) {
                await websiteApi.updateById(id, submitData);
            } else {
                await websiteApi.create(submitData);
            }

            message.success(t('general.success'));
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
            message.error(t('general.error'));
        } finally {
            setConfirmLoading(false);
        }
    }, [id, logo, timeLimit, expiredAt, t, onSuccess, onClose]);

    const handleSave = useCallback(() => {
        formRef.current?.validateFields().then(handleSubmit);
    }, [handleSubmit]);

    const drawerWidth = useMemo(() => {
        return Math.min(window.innerWidth - 200, 1200);
    }, []);

    const tabItems = useMemo(() => [
        {
            key: 'general',
            label: t('assets.general'),
            children: (
                <BasicView
                    logo={logo}
                    onLogoChange={setLogo}
                    logosData={logosQuery.data}
                />
            ),
            forceRender: true,
        },
        {
            key: 'headers',
            label: t('assets.custom_header'),
            children: <HeaderView />,
            forceRender: true,
        },
        {
            key: 'cert',
            label: t('assets.custom_certificate'),
            children: <CertView />,
            forceRender: true,
        },
        {
            key: 'modify-response',
            label: t('assets.modify_response'),
            children: (
                <Disabled disabled={license.isFree()}>
                    <WebsiteModifyResponseView />
                </Disabled>
            ),
            forceRender: true,
        },
        {
            key: 'public',
            label: t('assets.public'),
            children: (
                <PublicView
                    timeLimit={timeLimit}
                    onTimeLimitChange={setTimeLimit}
                    expiredAt={expiredAt}
                    onExpiredAtChange={setExpiredAt}
                />
            ),
            forceRender: true,
        },
    ], [t, logo, setLogo, logosQuery.data, license, timeLimit, setTimeLimit, expiredAt, setExpiredAt]);

    const drawerExtra = useMemo(() => (
        <Space>
            <Button onClick={onClose} className="border-gray-300">
                {t('actions.cancel')}
            </Button>
            <Button
                type="primary"
                onClick={handleSave}
                loading={confirmLoading}
                className="bg-blue-500 hover:bg-blue-600"
            >
                {t('actions.save')}
            </Button>
        </Space>
    ), [onClose, handleSave, confirmLoading, t]);

    return (
        <Drawer
            title={id ? t('actions.edit') : t('actions.new')}
            onClose={onClose}
            open={open}
            width={drawerWidth}
            className="website-drawer"
            destroyOnHidden
            extra={drawerExtra}
        >
            <div className="h-full -mt-4">
                <ProForm
                    formRef={formRef}
                    request={loadWebsiteData}
                    submitter={false}
                >
                    <ProFormText hidden name="id" />
                    <Tabs
                        items={tabItems}
                        defaultActiveKey="general"
                        className="h-full"
                        style={{ marginTop: '0' }}
                        tabBarStyle={{ marginBottom: '16px' }}
                    />
                </ProForm>
            </div>
        </Drawer>
    );
};

export default React.memo(WebsiteDrawer);

import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useEffect, useState} from 'react';
import {Button, Form, Input, message, Popconfirm, Table, type TableProps, Tabs} from "antd";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import dayjs, {Dayjs} from "dayjs";
import websiteApi from "@/api/website-api";
import {WebsiteFormData} from "@/pages/assets/website-drawer/types";
import {normalizePublicIPRules, parseURL} from "@/pages/assets/website-drawer/utils";
import PublicView from "@/pages/assets/website-drawer/PublicView";
import TempAllowView from "@/pages/assets/website-drawer/TempAllowView";
import HeaderView from "@/pages/assets/website-drawer/HeaderView";
import CertView from "@/pages/assets/website-drawer/CertView";
import Disabled from "@/components/Disabled";
import WebsiteModifyResponseView from "@/pages/assets/WebsiteModifyResponseView";
import {useLicense} from "@/hook/LicenseContext";
import WebsiteBasicFields from "@/pages/assets/website-drawer/WebsiteBasicFields";
import {getWebsiteHeaders, normalizeOriginHostMode, WebsiteBasicFormData} from "@/pages/assets/website-drawer/basic";
import websiteTempAllowApi, {WebsiteTempAllowEntry} from "@/api/website-temp-allow-api";

interface Props {
    websiteId?: string
}

type WebsiteSection = 'basic' | 'public' | 'temp-allow' | 'headers' | 'cert' | 'modify-response';

const WebsiteInfo = ({websiteId}: Props) => {
    const {websiteId: routeWebsiteId} = useParams();
    const id = websiteId || routeWebsiteId || '';
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {license} = useLicense();
    const [form] = Form.useForm();
    const [timeLimit, setTimeLimit] = useState(false);
    const [expiredAt, setExpiredAt] = useState<Dayjs>();
    const [websiteData, setWebsiteData] = useState<Partial<WebsiteFormData>>();

    useEffect(() => {
        if (!id) {
            navigate('/website');
        }
    }, [id, navigate]);

    const loadWebsiteData = async (): Promise<Partial<WebsiteBasicFormData>> => {
        const website = await websiteApi.getById(id);
        const {scheme, host, port} = parseURL(website.targetUrl);
        const nextWebsiteData: Partial<WebsiteFormData> = {
            ...website,
            originHostMode: normalizeOriginHostMode(website.originHostMode),
            originHostCustom: website.originHostCustom || '',
            public: website.public ? {
                ...website.public,
                ip: normalizePublicIPRules(website.public.ip)
            } : website.public
        };
        setWebsiteData(nextWebsiteData);

        if (website.public?.expiredAt && website.public.expiredAt > 0) {
            const date = dayjs(website.public.expiredAt);
            setExpiredAt(date);
            setTimeLimit(true);
        } else {
            setExpiredAt(undefined);
            setTimeLimit(false);
        }

        return {
            ...nextWebsiteData,
            scheme,
            host,
            port: parseInt(port, 10),
        };
    };

    const handleTimeLimitChange = (checked: boolean) => {
        setTimeLimit(checked);
        if (!checked) {
            setExpiredAt(undefined);
            form.setFieldValue(['public', 'expiredAt'], undefined);
        }
    };

    const handleExpiredAtChange = (date: Dayjs | null) => {
        setExpiredAt(date || undefined);
    };

    const sectionFields: Record<WebsiteSection, any[]> = {
        basic: [
            'logo',
            'name',
            'groupId',
            'entrance',
            'domain',
            'scheme',
            'host',
            'port',
            'originHostMode',
            'originHostCustom',
            'gatewayType',
            'gatewayId'
        ],
        public: [['public']],
        'temp-allow': [['tempAllow']],
        headers: ['headers'],
        cert: [['cert']],
        'modify-response': ['modifyRules']
    };

    const updateWebsite = async (section: WebsiteSection) => {
        await form.validateFields(sectionFields[section]);
        const values = form.getFieldsValue(true) as WebsiteBasicFormData;

        if (section === 'basic') {
            await websiteApi.updateBasic(id, {
                logo: values.logo,
                name: values.name,
                domain: values.domain,
                entrance: values.entrance,
                targetUrl: `${values.scheme}://${values.host}:${values.port}`,
                groupId: values.groupId,
                gatewayType: values.gatewayType,
                gatewayId: values.gatewayType ? values.gatewayId : '',
                originHostMode: values.originHostMode,
                originHostCustom: values.originHostMode === 'custom' ? values.originHostCustom : '',
                headers: getWebsiteHeaders(websiteData, values)
            });
            setWebsiteData(prev => ({
                ...prev,
                logo: values.logo,
                name: values.name,
                domain: values.domain,
                entrance: values.entrance,
                targetUrl: `${values.scheme}://${values.host}:${values.port}`,
                groupId: values.groupId,
                gatewayType: values.gatewayType,
                gatewayId: values.gatewayType ? values.gatewayId : '',
                originHostMode: values.originHostMode,
                originHostCustom: values.originHostMode === 'custom' ? values.originHostCustom : '',
                headers: getWebsiteHeaders(websiteData, values)
            }));
            return;
        }

        if (section === 'public') {
            const nextPublic = {
                ...values.public,
                ip: normalizePublicIPRules(values.public?.ip),
                expiredAt: timeLimit && expiredAt ? expiredAt.valueOf() : 0
            };
            await websiteApi.updatePublic(id, {public: nextPublic});
            setWebsiteData(prev => ({...prev, public: nextPublic}));
            return;
        }

        if (section === 'temp-allow') {
            await websiteApi.updateTempAllow(id, {tempAllow: values.tempAllow});
            setWebsiteData(prev => ({...prev, tempAllow: values.tempAllow}));
            return;
        }

        if (section === 'headers') {
            await websiteApi.updateHeaders(id, {headers: values.headers || []});
            setWebsiteData(prev => ({...prev, headers: values.headers || []}));
            return;
        }

        if (section === 'cert') {
            await websiteApi.updateCert(id, {cert: values.cert || {enabled: false}});
            setWebsiteData(prev => ({...prev, cert: values.cert || {enabled: false}}));
            return;
        }

        await websiteApi.updateModifyResponse(id, {modifyRules: values.modifyRules || []});
        setWebsiteData(prev => ({...prev, modifyRules: values.modifyRules || []}));
    };

    const mutation = useMutation({
        mutationFn: updateWebsite,
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });

    const tempAllowQuery = useQuery({
        queryKey: ['website-temp-allow', id],
        queryFn: () => websiteTempAllowApi.list(id),
        enabled: !!id,
    });

    const removeTempAllowMutation = useMutation({
        mutationFn: (record: WebsiteTempAllowEntry) => websiteTempAllowApi.remove(id, record.ip),
        onSuccess: () => {
            message.success(t('general.success'));
            tempAllowQuery.refetch();
        }
    });

    const formatRemaining = (seconds?: number) => {
        if (!seconds || seconds <= 0) {
            return '-';
        }
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) {
            return `${minutes}m ${secs}s`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const tempAllowColumns: TableProps<WebsiteTempAllowEntry>['columns'] = [
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            width: 180,
        },
        {
            title: t('assets.temp_allow_expires'),
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            width: 220,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('assets.temp_allow_remaining'),
            dataIndex: 'remainingSeconds',
            key: 'remainingSeconds',
            width: 140,
            render: (value: number) => formatRemaining(value),
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 100,
            render: (_: any, record) => (
                <Popconfirm
                    title={t('general.confirm_delete')}
                    okText={t('actions.delete')}
                    okButtonProps={{danger: true}}
                    onConfirm={() => removeTempAllowMutation.mutate(record)}
                >
                    <Button
                        type="link"
                        danger
                        size="small"
                        loading={removeTempAllowMutation.isPending && removeTempAllowMutation.variables?.ip === record.ip}
                    >
                        {t('actions.delete')}
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    const renderPane = (section: WebsiteSection, children: React.ReactNode) => {
        return (
            <div className="min-h-[520px] pr-2">
                {children}
                <div className="mt-6 flex justify-start">
                    <Button
                        type="primary"
                        loading={mutation.isPending && mutation.variables === section}
                        onClick={() => mutation.mutate(section)}
                    >
                        {t('actions.save')}
                    </Button>
                </div>
            </div>
        );
    };

    const tabsItems = [
        {
            key: 'basic',
            label: t('assets.general'),
            children: renderPane('basic', <WebsiteBasicFields showLogo={true}/>),
            forceRender: true
        },
        {
            key: 'public',
            label: t('assets.public'),
            children: renderPane('public',
                <PublicView
                    timeLimit={timeLimit}
                    onTimeLimitChange={handleTimeLimitChange}
                    expiredAt={expiredAt}
                    onExpiredAtChange={handleExpiredAtChange}
                />
            ),
            forceRender: true
        },
        {
            key: 'temp-allow',
            label: t('assets.temp_allow'),
            children: renderPane('temp-allow',
                <div className="space-y-4">
                    <TempAllowView/>
                    <Table
                        rowKey={(record) => `${record.websiteId}-${record.ip}`}
                        loading={tempAllowQuery.isFetching}
                        dataSource={tempAllowQuery.data || []}
                        columns={tempAllowColumns}
                        pagination={false}
                        size="small"
                    />
                </div>
            ),
            forceRender: true
        },
        {
            key: 'headers',
            label: t('assets.custom_header'),
            children: renderPane('headers', <HeaderView/>),
            forceRender: true
        },
        {
            key: 'cert',
            label: t('assets.custom_certificate'),
            children: renderPane('cert', <CertView/>),
            forceRender: true
        },
        {
            key: 'modify-response',
            label: t('assets.modify_response'),
            children: renderPane('modify-response',
                <Disabled disabled={license.isFree()}>
                    <WebsiteModifyResponseView/>
                </Disabled>
            ),
            forceRender: true
        }
    ];

    useFormRequest(form, ["form-request", "web/src/pages/assets/WebsiteInfo.tsx", id], loadWebsiteData, !!id);

    return (
        <Form autoComplete="off" form={form} layout="vertical">
            <Form.Item hidden={true} name="id">
                <Input/>
            </Form.Item>
            <Tabs
                tabPlacement="start"
                items={tabsItems}
                defaultActiveKey="basic"
            />
        </Form>
    );
};

export default WebsiteInfo;

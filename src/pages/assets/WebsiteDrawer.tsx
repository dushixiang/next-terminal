import React, { useEffect, useRef, useState } from 'react';
import { Button, Drawer, message, Space, Tabs } from "antd";
import { ProForm, ProFormInstance, ProFormText } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";

import websiteApi from "@/api/website-api";
import assetsApi from "@/api/asset-api";
import WebsiteModifyResponseView from "@/pages/assets/WebsiteModifyResponseView";
import { useLicense } from "@/hook/LicenseContext";
import Disabled from "@/components/Disabled";
import BasicView from "@/pages/assets/website-drawer/BasicView";
import HeaderView from "@/pages/assets/website-drawer/HeaderView";
import CertView from "@/pages/assets/website-drawer/CertView";
import PublicView from "@/pages/assets/website-drawer/PublicView";
import TempAllowView from "@/pages/assets/website-drawer/TempAllowView";
import { WebsiteFormData } from "@/pages/assets/website-drawer/types";
import { parseURL } from "@/pages/assets/website-drawer/utils";

export interface WebsiteDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    id?: string;
}

const WebsiteDrawer: React.FC<WebsiteDrawerProps> = ({
    open,
    onClose,
    onSuccess,
    id,
}) => {
    const { t } = useTranslation();
    const { license } = useLicense();
    const formRef = useRef<ProFormInstance>(null);

    const [timeLimit, setTimeLimit] = useState(false);
    const [expiredAt, setExpiredAt] = useState<Dayjs>();
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [logo, setLogo] = useState<string>();

    const logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    useEffect(() => {
        if (!open) {
            setLogo(undefined);
            setTimeLimit(false);
            setExpiredAt(undefined);
            setConfirmLoading(false);
        }
    }, [open]);

    const loadWebsiteData = async (): Promise<Partial<WebsiteFormData>> => {
        if (!id) {
            return {
                enabled: true,
                scheme: 'http',
                cert: { enabled: false },
                public: {
                    enabled: false,
                    expiredAt: 0,
                    countries: [],
                    provinces: [],
                    cities: [],
                },
                tempAllow: { enabled: false, durationMinutes: 5, autoRenew: false },
            };
        }

        try {
            const website = await websiteApi.getById(id);
            const { scheme, host, port } = parseURL(website.targetUrl);

            setLogo(website.logo);

            if (website.public?.expiredAt && website.public.expiredAt > 0) {
                const date = dayjs(website.public.expiredAt);
                setExpiredAt(date);
                setTimeLimit(true);
            } else {
                setExpiredAt(undefined);
                setTimeLimit(false);
            }

            return {
                ...website,
                scheme,
                host,
                port: parseInt(port, 10),
            };
        } catch (error) {
            console.error('Failed to load website data:', error);
            message.error(t('assets.website_load_failed'));
            throw error;
        }
    };

    const handleTimeLimitChange = (checked: boolean) => {
        setTimeLimit(checked);
        if (!checked) {
            setExpiredAt(undefined);
        }
    };

    const handleExpiredAtChange = (date: Dayjs | null) => {
        setExpiredAt(date || undefined);
    };

    const handleSubmit = async (values: WebsiteFormData) => {
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
    };

    const handleSave = () => {
        formRef.current?.validateFields().then(handleSubmit);
    };

    const tabItems = [
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
                    onTimeLimitChange={handleTimeLimitChange}
                    expiredAt={expiredAt}
                    onExpiredAtChange={handleExpiredAtChange}
                />
            ),
            forceRender: true,
        },
        {
            key: 'temp-allow',
            label: t('assets.temp_allow'),
            children: <TempAllowView />,
            forceRender: true,
        },
    ];

    const drawerExtra = (
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
    );

    return (
        <Drawer
            title={id ? t('actions.edit') : t('actions.new')}
            onClose={onClose}
            open={open}
            width={1200}
            className="website-drawer"
            destroyOnHidden
            extra={drawerExtra}
        >
            <div className="h-full -mt-4">
                <ProForm
                    formRef={formRef}
                    request={loadWebsiteData}
                    submitter={false}
                    autoComplete="off"
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

export default WebsiteDrawer;

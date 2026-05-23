import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useEffect, useState} from 'react';
import {Form, Input, message} from 'antd';
import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import websiteApi from "@/api/website-api";
import {WebsiteFormData} from "@/pages/assets/website-drawer/types";
import {normalizePublicIPRules, parseURL} from "@/pages/assets/website-drawer/utils";
import {useNavigate} from "react-router-dom";
import WebsiteBasicFields from "@/pages/assets/website-drawer/WebsiteBasicFields";
import {
    getDefaultWebsiteData,
    getWebsiteHeaders,
    inferOriginHost,
    normalizeOriginHostMode,
    WebsiteBasicFormData
} from "@/pages/assets/website-drawer/basic";

interface WebsitePostProps {
    id?: string;
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const WebsitePost = ({id, open, onClose, onSuccess}: WebsitePostProps) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [websiteData, setWebsiteData] = useState<Partial<WebsiteFormData>>();

    useEffect(() => {
        if (!open) {
            setWebsiteData(undefined);
            form.resetFields();
        }
    }, [open, form]);

    const loadWebsiteData = async (): Promise<Partial<WebsiteBasicFormData>> => {
        if (!id) {
            return getDefaultWebsiteData();
        }

        try {
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

            return {
                ...nextWebsiteData,
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

    const postOrUpdate = async (values: WebsiteBasicFormData) => {
        const {originHostMode, originHostCustom, ...restValues} = values;
        const defaults = getDefaultWebsiteData();
        const submitPublic = {
            ...(websiteData?.public || defaults.public),
            ip: normalizePublicIPRules(websiteData?.public?.ip || defaults.public?.ip)
        };
        const submitData: any = {
            ...websiteData,
            cert: websiteData?.cert || defaults.cert,
            public: submitPublic,
            tempAllow: websiteData?.tempAllow || defaults.tempAllow,
            headers: getWebsiteHeaders(websiteData, values),
            originHostMode,
            originHostCustom: originHostMode === 'custom' ? originHostCustom : '',
            ...restValues,
            gatewayId: restValues.gatewayType ? restValues.gatewayId : '',
            targetUrl: `${values.scheme}://${values.host}:${values.port}`,
        };

        if (id) {
            await websiteApi.updateBasic(id, {
                logo: submitData.logo,
                name: submitData.name,
                domain: submitData.domain,
                entrance: submitData.entrance,
                targetUrl: submitData.targetUrl,
                groupId: submitData.groupId,
                gatewayType: submitData.gatewayType,
                gatewayId: submitData.gatewayId,
                originHostMode: submitData.originHostMode,
                originHostCustom: submitData.originHostCustom,
                headers: submitData.headers
            });
            return undefined;
        } else {
            return await websiteApi.create(submitData);
        }
    };

    const mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: (website) => {
            message.success(t('general.success'));
            onSuccess?.();
            onClose();
            if (!id && website?.id) {
                navigate(`/website/${website.id}`);
            }
        }
    });

    const handleSubmit = (values: WebsiteFormData) => {
        mutation.mutate(values);
    };

    useFormRequest(form, ["form-request", "web/src/pages/assets/WebsitePost.tsx", open, id], loadWebsiteData, open);

    return (
        <Form autoComplete="off" form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item hidden={true} name="id">
                <Input/>
            </Form.Item>
            <WebsiteBasicFields showEntrance={false}/>
        </Form>
    );
};

export default WebsitePost;

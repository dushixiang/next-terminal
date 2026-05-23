import React from 'react';
import {Button, Col, Divider, Form, Row, Select, Tooltip} from "antd";
import {Info} from "lucide-react";
import {useTranslation} from "react-i18next";
import {SettingProps} from "@/pages/sysconf/SettingPage";
import propertyApi from "@/api/property-api";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {useQuery} from "@tanstack/react-query";

type NetworkSettingValues = Record<string, any> & {
    'ip-extractor'?: string;
    'ip-trust-list'?: string | string[];
};

const toIpTrustList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
};

const NetworkSetting = ({
                            get,
                            set
                        }: SettingProps) => {
    let {
        t
    } = useTranslation();
    const [form] = Form.useForm();

    const wrapGet = async () => {
        const values = await get();
        return {
            ...values,
            'ip-trust-list': toIpTrustList(values['ip-trust-list']),
        };
    };

    const clientIPsQuery = useQuery({
        queryKey: ['properties', 'client-ips'],
        queryFn: propertyApi.getClientIPs,
    });

    const wrapSet = (values: NetworkSettingValues) => {
        return set({
            ...values,
            'ip-trust-list': toIpTrustList(values['ip-trust-list']).join(','),
        });
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/NetworkSetting.tsx"], wrapGet, true);
    const clientIPs = clientIPsQuery.data;

    return <div>
        <Form form={form} onFinish={wrapSet} layout="vertical">
            <Divider titlePlacement="left">{t('settings.network.setting')}</Divider>
            <Form.Item name="ip-extractor" label={t('settings.system.ip.extractor')} rules={[{
                required: true
            }]}>
                <Select loading={clientIPsQuery.isLoading} options={[{
                    label: `${t('assets.addr')}${clientIPs?.direct ? ` (${clientIPs.direct})` : ''}`,
                    value: 'direct'
                }, {
                    label: `Header(X-Real-IP)${clientIPs?.['x-real-ip'] ? ` (${clientIPs['x-real-ip']})` : ` (${t('settings.network.not_detected')})`}`,
                    value: 'x-real-ip'
                }, {
                    label: `Header(X-Forwarded-For)${clientIPs?.['x-forwarded-for'] ? ` (${clientIPs['x-forwarded-for']})` : ` (${t('settings.network.not_detected')})`}`,
                    value: 'x-forwarded-for'
                }]}/>
            </Form.Item>

            <Form.Item noStyle={true} shouldUpdate={true}>{form => {
                const record = form.getFieldsValue(true);
                if (record['ip-extractor'] === 'direct') {
                    return null;
                }
                return <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <Form.Item name="ip-trust-list" label={<div className="flex items-center gap-1">
                            {t('settings.system.ip.trust_list')}
                            <Tooltip title={t('settings.network.trust_ip_tip')}>
                                <Info className="text-gray-400" size={12}/>
                            </Tooltip>
                        </div>}>
                            <Select
                                mode="tags"
                                placeholder={t('settings.system.ip.trust_placeholder')}
                            />
                        </Form.Item>
                    </Col>
                </Row>;
            }}</Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default NetworkSetting;

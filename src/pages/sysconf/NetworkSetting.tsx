import {Button, Col, Form, Input, Row, Select, Tooltip} from "antd";
import {Info} from "lucide-react";
import {useTranslation} from "react-i18next";
import {SettingProps} from "@/pages/sysconf/SettingPage";
import propertyApi from "@/api/property-api";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {useQuery} from "@tanstack/react-query";

const presetIPExtractors = ['direct', 'x-real-ip', 'x-forwarded-for'];

type NetworkSettingValues = Record<string, any> & {
    'ip-extractor'?: string;
    'ip-custom-header'?: string;
    'ip-trust-list'?: string | string[];
};

const normalizeIPExtractor = (value: unknown) => {
    if (typeof value !== 'string') {
        return 'direct';
    }
    const extractor = value.trim();
    return extractor.length > 0 ? extractor : 'direct';
};

const isPresetIPExtractor = (value: string) => {
    return presetIPExtractors.includes(value.toLowerCase());
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
        const extractor = normalizeIPExtractor(values['ip-extractor']);
        const normalizedExtractor = extractor.toLowerCase();
        return {
            ...values,
            'ip-extractor': isPresetIPExtractor(extractor) ? normalizedExtractor : 'custom',
            'ip-custom-header': isPresetIPExtractor(extractor) ? undefined : extractor,
            'ip-trust-list': toIpTrustList(values['ip-trust-list']),
        };
    };

    const clientIPsQuery = useQuery({
        queryKey: ['properties', 'client-ips'],
        queryFn: propertyApi.getClientIPs,
    });

    const wrapSet = (values: NetworkSettingValues) => {
        const extractor = values['ip-extractor'] === 'custom'
            ? normalizeIPExtractor(values['ip-custom-header'])
            : normalizeIPExtractor(values['ip-extractor']);
        const nextValues = {
            ...values,
            'ip-extractor': extractor,
            'ip-trust-list': toIpTrustList(values['ip-trust-list']).join(','),
        };
        delete nextValues['ip-custom-header'];
        return set(nextValues);
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/NetworkSetting.tsx"], wrapGet, true);
    const clientIPs = clientIPsQuery.data;

    return <div>
        <Form form={form} onFinish={wrapSet} layout="vertical">
            <Form.Item name="ip-extractor" label={t('settings.system.ip.extractor')} extra={t('settings.network.direct_ip_tip')} required={true}>
                <Select loading={clientIPsQuery.isLoading} options={[{
                    label: `${t('settings.network.direct_ip')}${clientIPs?.direct ? ` (${clientIPs.direct})` : ''}`,
                    value: 'direct'
                }, {
                    label: `${t('settings.network.header_option', {header: 'X-Real-IP'})}${clientIPs?.['x-real-ip'] ? ` (${clientIPs['x-real-ip']})` : ` (${t('settings.network.not_detected')})`}`,
                    value: 'x-real-ip'
                }, {
                    label: `${t('settings.network.header_option', {header: 'X-Forwarded-For'})}${clientIPs?.['x-forwarded-for'] ? ` (${clientIPs['x-forwarded-for']})` : ` (${t('settings.network.not_detected')})`}`,
                    value: 'x-forwarded-for'
                }, {
                    label: t('settings.network.custom_header'),
                    value: 'custom'
                }]}/>
            </Form.Item>

            <Form.Item noStyle={true} shouldUpdate={true}>{form => {
                const record = form.getFieldsValue(true);
                if (record['ip-extractor'] === 'direct') {
                    return null;
                }
                return <Row gutter={[16, 16]}>
                    {record['ip-extractor'] === 'custom' && <Col xs={24}>
                        <Form.Item
                            name="ip-custom-header"
                            label={t('settings.network.custom_header_name')}
                            rules={[{
                                required: true,
                                whitespace: true,
                                message: t('settings.network.custom_header_required')
                            }]}
                        >
                            <Input placeholder={t('settings.network.custom_header_placeholder')}/>
                        </Form.Item>
                    </Col>}
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

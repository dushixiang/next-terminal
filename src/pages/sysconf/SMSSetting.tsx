import { useState } from 'react';
import { App, Button, Form, Input, Select, Spin, Switch, Tabs, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import propertyApi from '@/api/property-api';
import { useFormRequest } from '@/hook/use-antd-form-query';
import { SettingProps } from './SettingPage';

const providers = ['tencent', 'aliyun', 'aliyun-pnvs', 'volcengine', 'webhook'];
const providerDocs: Record<string, string> = {
    tencent: 'https://cloud.tencent.com/document/product/382',
    aliyun: 'https://help.aliyun.com/zh/sms/',
    'aliyun-pnvs': 'https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode',
    volcengine: 'https://www.volcengine.com/docs/6361',
};
const languages = [
    { code: 'zh-CN', label: 'general.language_zh_cn' },
    { code: 'en-US', label: 'general.language_en_us' },
    { code: 'zh-TW', label: 'general.language_zh_tw' },
    { code: 'ja-JP', label: 'general.language_ja_jp' },
];

const SMSSetting = ({ get, set }: SettingProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [language, setLanguage] = useState('zh-CN');
    const [dirty, setDirty] = useState(false);
    const testSMS = useMutation({
        mutationFn: propertyApi.sendSMS,
        onSuccess: () => message.success(t(query.data?.['sms-provider'] === 'webhook' ? 'settings.sms.webhook_success' : 'settings.sms_test.success')),
    });
    const [saving, setSaving] = useState(false);
    const query = useFormRequest(form, ['form-request', 'sms-setting'], get);
    const enabled = Form.useWatch('sms-enabled', form);
    const provider = Form.useWatch('sms-provider', form) || 'tencent';
    const prefix = `sms-${provider}-`;
    const isAliyun = provider === 'aliyun' || provider === 'aliyun-pnvs';
    const save = async () => {
        setSaving(true);
        try {
            const values = Object.fromEntries(
                Object.entries(form.getFieldsValue(true)).filter(
                    ([key]) =>
                        key.startsWith('sms-') &&
                        !key.startsWith('sms-login-') &&
                        !key.startsWith('sms-mfa-') &&
                        !key.endsWith('-exists'),
                ),
            );
            if ((await set(values)) !== false) {
                setDirty(false);
                await query.refetch();
            }
        } finally {
            setSaving(false);
        }
    };
    if (query.isPending) return <Spin />;
    return (
        <Tabs
            items={[
                {
                    key: 'connection',
                    label: t('settings.verification_services.connection'),
                    children: (
                        <div className="max-w-5xl">
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={save}
                                onFinishFailed={({ errorFields }) => {
                                    const field = String(errorFields[0]?.name[0] || '');
                                    const match = languages.find(({ code }) => field.endsWith(`template-${code}`));
                                    if (match) setLanguage(match.code);
                                }}
                                disabled={saving}
                                onValuesChange={() => setDirty(true)}
                                initialValues={{
                                    'sms-enabled': false,
                                    'sms-provider': 'tencent',
                                    'sms-webhook-body': '{"phone":"{{phone}}","code":"{{code}}","minutes":"{{minutes}}","language":"{{language}}"}',
                                }}>
                                <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                                    <div>
                                        <h3 className="mb-4 font-medium">
                                            {t('settings.verification_services.connection')}
                                        </h3>
                                        <Form.Item
                                            name="sms-enabled"
                                            label={t('settings.sms.enabled')}
                                            valuePropName="checked">
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            name="sms-provider"
                                            label={t('settings.sms.provider')}
                                            extra={
                                                <div>
                                                    <div>{t(`settings.sms.${provider}_setup_tip`)}</div>
                                                    {providerDocs[provider] && (
                                                        <Typography.Link
                                                        href={providerDocs[provider]}
                                                        target="_blank"
                                                        rel="noopener noreferrer">
                                                        {t('settings.sms.official_docs')}
                                                    </Typography.Link>
                                                    )}
                                                </div>
                                            }>
                                            <Select
                                                options={providers.map((value) => ({
                                                    value,
                                                    label: t(`settings.sms.${value}`),
                                                }))}
                                            />
                                        </Form.Item>
                                        {provider === 'webhook' ? (
                                            <>
                                                <Form.Item name="sms-webhook-url" label="Webhook URL"
                                                    rules={[{ required: !!enabled }, { type: 'url' }]}>
                                                    <Input placeholder="https://example.com/api/send-sms" />
                                                </Form.Item>
                                                <Form.Item
                                                    name="sms-webhook-headers"
                                                    label={t('settings.sms.webhook_headers')}
                                                    extra={t('settings.sms.webhook_headers_tip')}
                                                    rules={[{
                                                        validator: async (_, value) => {
                                                            if (!value?.trim()) return;
                                                            try {
                                                                const headers = JSON.parse(value);
                                                                if (!headers || Array.isArray(headers) || typeof headers !== 'object') throw new Error();
                                                                const seen = new Set<string>();
                                                                for (const [name, content] of Object.entries(headers)) {
                                                                    const lower = name.toLowerCase();
                                                                    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || seen.has(lower) ||
                                                                        ['host', 'content-length', 'transfer-encoding', 'connection', 'trailer'].includes(lower) ||
                                                                        typeof content !== 'string' || /[\x00-\x08\x0a-\x1f\x7f]/.test(content)) throw new Error();
                                                                    seen.add(lower);
                                                                }
                                                            } catch {
                                                                throw new Error(t('settings.sms.webhook_headers_invalid'));
                                                            }
                                                        },
                                                    }]}>
                                                    <Input.TextArea
                                                        autoSize={{ minRows: 4, maxRows: 10 }}
                                                        placeholder={'{\n  "X-API-Key": "your-api-key"\n}'}
                                                        autoComplete="off"
                                                    />
                                                </Form.Item>
                                            </>
                                        ) : (
                                            <>
                                                <Form.Item
                                                    name={`${prefix}access-key-id`}
                                                    label={provider === 'tencent' ? 'Secret ID' : 'Access Key ID'}
                                                    rules={[{ required: !!enabled }]}>
                                                    <Input />
                                                </Form.Item>
                                                <Form.Item
                                                    name={`${prefix}secret-access-key`}
                                                    label={
                                                        provider === 'tencent'
                                                            ? 'Secret Key'
                                                            : isAliyun
                                                              ? 'Access Key Secret'
                                                              : 'Secret Access Key'
                                                    }
                                                    rules={[
                                                        {
                                                            required:
                                                                !!enabled && !query.data?.[`${prefix}secret-access-key-exists`],
                                                        },
                                                    ]}
                                                    extra={t('settings.sms.secret_tip')}>
                                                    <Input.Password autoComplete="new-password" />
                                                </Form.Item>
                                                {provider === 'tencent' && (
                                                    <Form.Item
                                                        name={`${prefix}app-id`}
                                                        label="SMS SDK App ID"
                                                        rules={[{ required: !!enabled }]}>
                                                        <Input />
                                                    </Form.Item>
                                                )}
                                                {provider === 'aliyun-pnvs' && (
                                                    <Form.Item
                                                        name={`${prefix}scheme-name`}
                                                        label={t('settings.sms.scheme_name')}
                                                        extra={t('settings.sms.scheme_name_tip')}
                                                        rules={[{ type: 'string', max: 20 }]}>
                                                        <Input maxLength={20} />
                                                    </Form.Item>
                                                )}
                                                {provider === 'volcengine' && (
                                                    <Form.Item
                                                        name={`${prefix}sms-account`}
                                                        label="SMS Account"
                                                        rules={[{ required: !!enabled }]}>
                                                        <Input />
                                                    </Form.Item>
                                                )}
                                                <Form.Item name={`${prefix}region`} label={t('settings.sms.region')}>
                                                    <Input
                                                        placeholder={
                                                            provider === 'tencent'
                                                                ? 'ap-guangzhou'
                                                                : provider === 'volcengine'
                                                                  ? 'cn-north-1'
                                                                  : 'cn-hangzhou'
                                                        }
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    name={`${prefix}sign-name`}
                                                    label={t('settings.sms.sign')}
                                                    rules={[{ required: !!enabled }]}>
                                                    <Input />
                                                </Form.Item>
                                            </>
                                        )}
                                    </div>
                                    {provider === 'webhook' ? (
                                        <div>
                                            <h3 className="mb-4 font-medium">{t('settings.sms.webhook_body')}</h3>
                                            <Form.Item name="sms-webhook-body" label={t('settings.sms.webhook_body')}
                                                extra={t('settings.sms.webhook_body_tip', { interpolation: { prefix: '[[', suffix: ']]' } })}
                                                rules={[{ required: !!enabled }, {
                                                    validator: async (_, value) => {
                                                        if (!value) return;
                                                        try {
                                                            const body = JSON.parse(value);
                                                            const found = new Set<string>();
                                                            const visit = (item: unknown): void => {
                                                                if (typeof item === 'string') {
                                                                    for (const match of item.matchAll(/\{\{([^{}]*)\}\}/g)) {
                                                                        if (!['phone', 'code', 'minutes', 'language'].includes(match[1])) throw new Error();
                                                                        found.add(match[1]);
                                                                    }
                                                                } else if (Array.isArray(item)) item.forEach(visit);
                                                                else if (item && typeof item === 'object') {
                                                                    Object.entries(item).forEach(([key, child]) => {
                                                                        if (key.includes('{{') || key.includes('}}')) throw new Error();
                                                                        visit(child);
                                                                    });
                                                                }
                                                            };
                                                            visit(body);
                                                            if (!found.has('phone') || !found.has('code')) throw new Error();
                                                        } catch {
                                                            throw new Error(t('settings.sms.webhook_body_invalid', { interpolation: { prefix: '[[', suffix: ']]' } }));
                                                        }
                                                    },
                                                }]}>
                                                <Input.TextArea autoSize={{ minRows: 10, maxRows: 24 }} />
                                            </Form.Item>
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="mb-4 font-medium">
                                                {t('settings.verification_services.sms_templates')}
                                            </h3>
                                            <Form.Item
                                                name={`${prefix}parameters`}
                                                label={t('settings.sms.parameters')}
                                                extra={t(
                                                    provider === 'aliyun-pnvs'
                                                        ? 'settings.sms.pnvs_parameters_tip'
                                                        : 'settings.sms.parameters_tip',
                                                )}>
                                                <Input
                                                    placeholder={provider === 'aliyun-pnvs' ? '["code","min"]' : '["code"]'}
                                                />
                                            </Form.Item>
                                            <div className="mb-5">
                                                <Space wrap aria-label={t('settings.sms_test.language')}>
                                                    {languages.map(({ code, label }) => (
                                                        <Button
                                                            key={code}
                                                            type={language === code ? 'primary' : 'default'}
                                                            aria-pressed={language === code}
                                                            onClick={() => setLanguage(code)}
                                                            disabled={saving}>
                                                            {t(label)}
                                                        </Button>
                                                    ))}
                                                </Space>
                                            </div>
                                            {languages.map(({ code }) => (
                                                <Form.Item
                                                    key={code}
                                                    hidden={code !== language}
                                                    name={`${prefix}template-${code}`}
                                                    label={t(
                                                        isAliyun
                                                            ? 'settings.sms.template_code'
                                                            : 'settings.sms.template_id',
                                                    )}
                                                    rules={[{ required: !!enabled && code === 'zh-CN' }]}
                                                    extra={t('settings.sms.language_tip')}>
                                                    <Input />
                                                </Form.Item>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Form.Item>
                                    <Button type="primary" htmlType="submit" loading={saving}>
                                        {t('actions.save')}
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    ),
                },
                {
                    key: 'test',
                    label: t('settings.sms_test.title'),
                    children: (
                        <div className="max-w-xl pt-2">
                            <div className="mb-4">
                                <Typography.Text type="secondary">
                                    {t(dirty ? 'settings.sms_test.save_first' : 'settings.sms_test.tip')}
                                </Typography.Text>
                            </div>
                            <Form
                                layout="vertical"
                                initialValues={{ language: 'zh-CN' }}
                                disabled={dirty || saving || !query.data?.['sms-enabled'] || testSMS.isPending}
                                onFinish={(values) => testSMS.mutate(values)}>
                                <Form.Item
                                    name="phone"
                                    label={t('settings.sms_test.phone')}
                                    rules={[{ required: true }]}>
                                    <Input autoComplete="tel" placeholder="+8613800138000" />
                                </Form.Item>
                                <Form.Item
                                    name="language"
                                    label={t('settings.sms_test.language')}
                                    rules={[{ required: true }]}>
                                    <Select
                                        options={languages.map(({ code, label }) => ({
                                            value: code,
                                            label: t(label),
                                        }))}
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Button htmlType="submit" loading={testSMS.isPending}>
                                        {t('settings.sms_test.send')}
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    ),
                },
            ]}
        />
    );
};
export default SMSSetting;

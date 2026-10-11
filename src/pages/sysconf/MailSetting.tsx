import MailTemplateSetting from './MailTemplateSetting';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { App, Button, Form, Input, InputNumber, Spin, Switch, Tabs, Typography } from 'antd';
import { SettingProps } from './SettingPage';
import { useTranslation } from 'react-i18next';
import propertyApi from '@/api/property-api';
import { useFormRequest } from '@/hook/use-antd-form-query';

const MailSetting = ({ get, set }: SettingProps) => {
    let { t } = useTranslation();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const enabled = Form.useWatch('mail-enabled', form);
    let { message } = App.useApp();
    const query = useFormRequest(form, ['form-request', 'mail-setting'], get);
    const save = async (values: Record<string, unknown>) => {
        setSaving(true);
        try {
            if ((await set(values)) !== false) {
                setDirty(false);
                await query.refetch();
            }
        } finally {
            setSaving(false);
        }
    };
    const testMail = useMutation({
        mutationFn: propertyApi.sendMail,
        onSuccess: () => message.success(t('general.success')),
    });
    if (query.isPending) return <Spin />;
    return (
        <Tabs
            items={[
                {
                    key: 'connection',
                    label: t('settings.verification_services.connection'),
                    children: (
                        <div className="max-w-3xl">
                            <Form
                                form={form}
                                onFinish={save}
                                layout="vertical"
                                disabled={saving}
                                onValuesChange={() => setDirty(true)}>
                                <Form.Item
                                    name="mail-enabled"
                                    label={t('settings.mail.enabled')}
                                    rules={[
                                        {
                                            required: true,
                                        },
                                    ]}
                                    valuePropName="checked">
                                    <Switch
                                        checkedChildren={t('general.enabled')}
                                        unCheckedChildren={t('general.disabled')}
                                    />
                                </Form.Item>
                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                    <Form.Item
                                        name="mail-host"
                                        label={t('settings.mail.host')}
                                        rules={[{ required: !!enabled }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        name="mail-port"
                                        label={t('settings.mail.port')}
                                        rules={[{ required: !!enabled }]}>
                                        <InputNumber
                                            precision={0}
                                            min={1}
                                            max={65535}
                                            style={{
                                                width: '100%',
                                            }}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="mail-username"
                                        label={t('settings.mail.username')}
                                        rules={[{ required: !!enabled }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        name="mail-password"
                                        label={t('settings.mail.password')}
                                        rules={[{ required: !!enabled }]}>
                                        <Input.Password />
                                    </Form.Item>
                                </div>
                                <Form.Item name="mail-from" label={t('settings.mail.from')}>
                                    <Input placeholder="name <username>" />
                                </Form.Item>
                                <Form.Item
                                    name="notification-site-url"
                                    label={t('settings.mail.site_url')}
                                    extra={t('settings.mail.site_url_tip')}
                                    rules={[{ type: 'url' }]}>
                                    <Input placeholder="https://terminal.example.com" />
                                </Form.Item>
                                <Form.Item
                                    name="mail-use-ssl"
                                    label={t('settings.mail.use_tls')}
                                    valuePropName="checked">
                                    <Switch
                                        checkedChildren={t('general.enabled')}
                                        unCheckedChildren={t('general.disabled')}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="mail-insecure-skip-verify"
                                    label={t('settings.mail.skip_certificate_verify')}
                                    valuePropName="checked">
                                    <Switch
                                        checkedChildren={t('general.enabled')}
                                        unCheckedChildren={t('general.disabled')}
                                    />
                                </Form.Item>

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
                    key: 'templates',
                    label: t('settings.mail_templates.title'),
                    children: <MailTemplateSetting get={get} set={set} />,
                },
                {
                    key: 'test',
                    label: t('settings.verification_services.test'),
                    children: (
                        <div className="max-w-3xl">
                            <div className="pt-2">
                                <div className="mb-4">
                                    <Typography.Text type="secondary">
                                        {t(dirty ? 'settings.service_layout.save_first' : 'settings.mail.tip')}
                                    </Typography.Text>
                                </div>
                                <Form
                                    onFinish={(values) => testMail.mutate(values)}
                                    layout="vertical"
                                    disabled={dirty || !query.data?.['mail-enabled'] || saving || testMail.isPending}>
                                    <Form.Item
                                        name="mail"
                                        label={t('settings.mail.mail')}
                                        rules={[{ required: true }, { type: 'email' }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        name="title"
                                        label={t('settings.mail.title')}
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        name="content"
                                        label={t('settings.mail.content')}
                                        rules={[
                                            {
                                                required: true,
                                            },
                                        ]}>
                                        <Input.TextArea rows={4} />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" loading={testMail.isPending}>
                                            {t('settings.mail.send')}
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </div>
                        </div>
                    ),
                },
            ]}
        />
    );
};
export default MailSetting;

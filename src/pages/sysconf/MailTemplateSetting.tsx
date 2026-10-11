import { Button, Form, Input, Popover, Spin, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useFormRequest } from '@/hook/use-antd-form-query';
import { SettingProps } from './SettingPage';

const languages = [
    { code: 'zh-CN', label: 'general.language_zh_cn' },
    { code: 'en-US', label: 'general.language_en_us' },
    { code: 'zh-TW', label: 'general.language_zh_tw' },
    { code: 'ja-JP', label: 'general.language_ja_jp' },
];
const variables = ['RecipientName', 'SystemName', 'NewEmail', 'Code', 'Minutes', 'NewPassword', 'IP', 'GenerateTime'];
const kinds = ['email-change', 'verification', 'password-reset', 'password-changed'];

const MailTemplateSetting = ({ get, set }: SettingProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [kind, setKind] = useState('email-change');
    const [language, setLanguage] = useState('zh-CN');
    const [saving, setSaving] = useState(false);
    const query = useFormRequest(form, ['form-request', 'mail-templates'], get);
    const save = async () => {
        setSaving(true);
        try {
            const values = Object.fromEntries(
                Object.entries(form.getFieldsValue(true)).filter(([key]) => key.startsWith('mail-template-')),
            );
            if ((await set(values)) !== false) await query.refetch();
        } finally {
            setSaving(false);
        }
    };
    const templateHelp = (
        <div style={{ width: 'min(480px, calc(100vw - 64px))', maxHeight: '60vh', overflowY: 'auto' }}>
            <p className="mb-3">{t('settings.mail_templates.tip')}</p>
            <dl className="space-y-3">
                {variables.map((variable) => (
                    <div key={variable}>
                        <dt>
                            <code>{`{{.${variable}}}`}</code>
                        </dt>
                        <dd className="mt-1 text-gray-500">{t(`settings.mail_templates.variables.${variable}`)}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-3 mb-0">{t('settings.mail_templates.variable_usage')}</p>
        </div>
    );
    const helpButton = (
        <Popover
            trigger="click"
            placement="bottomRight"
            title={t('settings.mail_templates.help')}
            content={templateHelp}>
            <Button type="link" size="small">
                {t('settings.mail_templates.help')}
            </Button>
        </Popover>
    );
    if (query.isPending) return <Spin />;
    return (
        <div className="max-w-5xl">
            <Form
                form={form}
                layout="vertical"
                onFinish={save}
                onFinishFailed={({ errorFields }) => {
                    const field = String(errorFields[0]?.name[0] || '');
                    for (const templateKind of kinds) {
                        for (const { code } of languages) {
                            if (field.startsWith(`mail-template-${templateKind}-${code}-`)) {
                                setKind(templateKind);
                                setLanguage(code);
                                return;
                            }
                        }
                    }
                }}
                disabled={saving}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
                    <div
                        className="flex flex-wrap gap-2 md:flex-col"
                        aria-label={t('settings.service_layout.scenario')}>
                        {kinds.map((value) => (
                            <Button
                                key={value}
                                color={kind === value ? 'primary' : 'default'}
                                variant={kind === value ? 'filled' : 'text'}
                                className="md:text-left"
                                style={{
                                    height: 'auto',
                                    whiteSpace: 'normal',
                                    padding: '10px 12px',
                                    justifyContent: 'flex-start',
                                }}
                                aria-pressed={kind === value}
                                onClick={() => setKind(value)}
                                disabled={saving}>
                                {t(`settings.mail_templates.${value}`)}
                            </Button>
                        ))}
                    </div>
                    <div className="min-w-0">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <Space wrap aria-label={t('settings.sms_test.language')}>
                                {languages.map(({ code, label }) => (
                                    <Button
                                        key={code}
                                        color={language === code ? 'primary' : 'default'}
                                        variant={language === code ? 'filled' : 'outlined'}
                                        aria-pressed={language === code}
                                        onClick={() => setLanguage(code)}
                                        disabled={saving}>
                                        {t(label)}
                                    </Button>
                                ))}
                            </Space>
                            {helpButton}
                        </div>
                        {kinds.flatMap((templateKind) =>
                            languages.map(({ code }) => (
                                <div key={`${templateKind}-${code}`}>
                                    <Form.Item
                                        hidden={templateKind !== kind || code !== language}
                                        name={`mail-template-${templateKind}-${code}-subject`}
                                        label={t('settings.mail.title')}
                                        rules={[{ max: 32768 }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item
                                        hidden={templateKind !== kind || code !== language}
                                        name={`mail-template-${templateKind}-${code}-body`}
                                        label={t('settings.mail.content')}
                                        rules={[{ max: 32768 }]}>
                                        <Input.TextArea rows={8} />
                                    </Form.Item>
                                </div>
                            )),
                        )}
                        <Form.Item className="mt-4">
                            <Button type="primary" htmlType="submit" loading={saving}>
                                {t('actions.save')}
                            </Button>
                        </Form.Item>
                    </div>
                </div>
            </Form>
        </div>
    );
};
export default MailTemplateSetting;

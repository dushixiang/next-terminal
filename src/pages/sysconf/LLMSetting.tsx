import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useRef, useState} from 'react';
import {Alert, Button, Divider, Form, FormInstance, Input, InputNumber, Switch, Typography} from 'antd';
import {SettingProps} from './SettingPage';
import {useTranslation} from 'react-i18next';
import {useMobile} from '@/hook/use-mobile';
import {cn} from '@/lib/utils';
import propertyApi from '@/api/property-api';

const {
    Title
} = Typography;

interface AssistantSectionProps {
    enabled: boolean;
    namePrefix: string; // 'shell' | 'audit' | 'audit-rdp'
    configLabel: string;
    description?: string;
    enableLabel: string;
    promptLabel: string;
    promptPlaceholder: string;
}

const AssistantSection: React.FC<AssistantSectionProps> = ({
                                                               enabled,
                                                               namePrefix,
                                                               configLabel,
                                                               description,
                                                               enableLabel,
                                                               promptLabel,
                                                               promptPlaceholder
                                                           }) => {
    return <>
        <Divider titlePlacement="left">{configLabel}</Divider>
        {description && <Typography.Paragraph type="secondary" style={{
            marginBottom: 16
        }}>
            {description}
        </Typography.Paragraph>}
        <Form.Item name={`llm-${namePrefix}-enabled`} label={enableLabel} valuePropName="checked">
            <Switch disabled={!enabled}/>
        </Form.Item>
        <Form.Item name={`llm-${namePrefix}-prompt`} label={promptLabel}>
            <Input.TextArea rows={6} autoSize={{
                minRows: 6,
                maxRows: 12
            }} disabled={!enabled} placeholder={promptPlaceholder}/>
        </Form.Item>
    </>;
};
type TestResult = {
    success: true;
    content: string;
} | {
    success: false;
    error: string;
};
const LLMSetting: React.FC<SettingProps> = ({
                                                get,
                                                set
                                            }) => {
    const {
        t
    } = useTranslation();
    const {
        isMobile
    } = useMobile();
    const formRef = useRef<FormInstance>(null);
    const [enabled, setEnabled] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const wrapGet = async () => {
        const values = await get();
        setEnabled(values['llm-enabled']);
        if (!values['llm-shell-prompt']) {
            values['llm-shell-prompt'] = t('settings.llm.shell_prompt_default');
        }
        if (!values['llm-audit-prompt']) {
            values['llm-audit-prompt'] = t('settings.llm.audit_prompt_default');
        }
        if (!values['llm-audit-rdp-prompt']) {
            values['llm-audit-rdp-prompt'] = t('settings.llm.audit_rdp_prompt_default');
        }
        return values;
    };
    const handleTest = async () => {
        try {
            await formRef.current?.validateFields(['llm-api-key', 'llm-base-url', 'llm-model']);
        } catch {
            return;
        }
        const values = formRef.current?.getFieldsValue() ?? {};
        setTesting(true);
        setTestResult(null);
        try {
            const temperatureRaw = values['llm-temperature'];
            const maxTokensRaw = values['llm-max-tokens'];
            const data = await propertyApi.testLLM({
                apiKey: values['llm-api-key'],
                baseUrl: values['llm-base-url'],
                proxyUrl: values['llm-proxy-url'],
                model: values['llm-model'],
                temperature: temperatureRaw !== undefined && temperatureRaw !== '' ? Number(temperatureRaw) : undefined,
                maxTokens: maxTokensRaw !== undefined && maxTokensRaw !== '' ? Number(maxTokensRaw) : undefined
            });
            setTestResult({
                success: true,
                content: data.content
            });
        } catch (err: any) {
            const msg = err?.message || String(err);
            setTestResult({
                success: false,
                error: msg
            });
        } finally {
            setTesting(false);
        }
    };
    useFormRequest(formRef, ["form-request", "web/src/pages/sysconf/LLMSetting.tsx"], wrapGet, true);
    return <div className={cn(isMobile && 'px-2')}>
        <Title level={5} style={{
            marginTop: 0
        }}>{t('settings.llm.title')}</Title>

        <Form onFinish={set} layout="vertical" ref={formRef}>
            <Divider titlePlacement="left">{t('settings.llm.base_config')}</Divider>
            <Form.Item name="llm-enabled" label={t('settings.llm.enable')} valuePropName="checked">
                <Switch onChange={setEnabled}/>
            </Form.Item>

            <Form.Item name="llm-api-key" label={t('settings.llm.api_key')} rules={[{
                required: enabled,
                message: t('settings.llm.api_key_required')
            }]}>
                <Input.Password disabled={!enabled} placeholder={t('settings.llm.api_key_placeholder')}/>
            </Form.Item>

            <Form.Item name="llm-base-url" label={t('settings.llm.base_url')} rules={[{
                required: enabled,
                message: t('settings.llm.base_url_required')
            }]}>
                <Input disabled={!enabled} placeholder="https://api.openai.com/v1"/>
            </Form.Item>

            <Form.Item name="llm-proxy-url" label={t('settings.llm.proxy_url')}>
                <Input disabled={!enabled} placeholder={t('settings.llm.proxy_url_placeholder')}/>
            </Form.Item>

            <Form.Item name="llm-model" label={t('settings.llm.model')} rules={[{
                required: enabled,
                message: t('settings.llm.model_required')
            }]}>
                <Input disabled={!enabled} placeholder="gpt-3.5-turbo"/>
            </Form.Item>

            <Form.Item name="llm-temperature" label={t('settings.llm.temperature')} initialValue={0.7}>
                <InputNumber step={0.1} precision={1} disabled={!enabled} min={0} max={2} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item name="llm-max-tokens" label={t('settings.llm.max_tokens')} initialValue={4096}>
                <InputNumber disabled={!enabled} min={1} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item label={t('settings.llm.test')}>
                <div className={'space-y-2'}>
                    <Button type="primary" ghost onClick={handleTest} loading={testing} disabled={!enabled}>
                        {t('settings.llm.test_button')}
                    </Button>
                    <Typography.Text type="secondary" style={{
                        display: 'block',
                        fontSize: 12
                    }}>
                        {t('settings.llm.test_tip')}
                    </Typography.Text>
                    {testResult && <Alert type={testResult.success ? 'success' : 'error'}
                                          title={testResult.success ? t('settings.llm.test_response') : t('settings.llm.test_failed')}
                                          description={<Typography.Paragraph copyable={testResult.success === true ? {
                                              text: testResult.content
                                          } : false} style={{
                                              marginBottom: 0,
                                              whiteSpace: 'pre-wrap'
                                          }} ellipsis={{
                                              rows: 10,
                                              expandable: true
                                          }}>
                                              {testResult.success === true ? testResult.content && testResult.content.trim().length > 0 ? testResult.content : t('settings.llm.test_response_empty') : testResult.error}
                                          </Typography.Paragraph>} showIcon closable
                                          onClose={() => setTestResult(null)}/>}
                </div>
            </Form.Item>

            <AssistantSection enabled={enabled} namePrefix="shell" configLabel={t('settings.llm.shell_config')}
                              enableLabel={t('settings.llm.shell_enable')} promptLabel={t('settings.llm.shell_prompt')}
                              promptPlaceholder={t('settings.llm.shell_prompt_placeholder')}/>

            <AssistantSection enabled={enabled} namePrefix="audit" configLabel={t('settings.llm.audit_config')}
                              description={t('settings.llm.audit_config_desc')}
                              enableLabel={t('settings.llm.audit_enable')} promptLabel={t('settings.llm.audit_prompt')}
                              promptPlaceholder={t('settings.llm.audit_prompt_placeholder')}/>

            <AssistantSection enabled={enabled} namePrefix="audit-rdp" configLabel={t('settings.llm.audit_rdp_config')}
                              description={t('settings.llm.audit_rdp_config_desc')}
                              enableLabel={t('settings.llm.audit_rdp_enable')}
                              promptLabel={t('settings.llm.audit_rdp_prompt')}
                              promptPlaceholder={t('settings.llm.audit_rdp_prompt_placeholder')}/>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default LLMSetting;

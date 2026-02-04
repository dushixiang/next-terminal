import React, { useState } from 'react';
import { Alert, Button, Divider, Typography } from 'antd';
import { SettingProps } from './SettingPage';
import { useTranslation } from 'react-i18next';
import { ProForm, ProFormDigit, ProFormSelect, ProFormSwitch, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { useMobile } from '@/hook/use-mobile';
import { cn } from '@/lib/utils';

const { Title } = Typography;

const LLMSetting: React.FC<SettingProps> = ({ get, set }) => {
    const { t } = useTranslation();
    const { isMobile } = useMobile();
    const [enabled, setEnabled] = useState(false);

    const wrapGet = async () => {
        const values = await get();
        setEnabled(values['llm-enabled']);
        
        // 设置默认的提示词
        if (!values['llm-shell-prompt']) {
            values['llm-shell-prompt'] = t('settings.llm.shell_prompt_default');
        }

        if (!values['llm-audit-prompt']) {
            values['llm-audit-prompt'] = t('settings.llm.audit_prompt_default');
        }

        return values;
    };

    return (
        <div className={cn(isMobile && 'px-2')}>
            <Title level={5} style={{ marginTop: 0 }}>{t('settings.llm.title')}</Title>
            
            <ProForm
                onFinish={set}
                request={wrapGet}
                autoFocus={false}
                submitter={{
                    resetButtonProps: {
                        style: { display: 'none' }
                    }
                }}
                layout={isMobile ? 'vertical' : 'horizontal'}
                labelCol={isMobile ? undefined : { span: 6 }}
                wrapperCol={isMobile ? undefined : { span: 14 }}
            >
                <Divider orientation="left">{t('settings.llm.base_config')}</Divider>
                <ProFormSwitch
                    name="llm-enabled"
                    label={t('settings.llm.enable')}
                    fieldProps={{
                        onChange: setEnabled
                    }}
                />
                
                <ProFormText.Password
                    name="llm-api-key"
                    label={t('settings.llm.api_key')}
                    placeholder={t('settings.llm.api_key_placeholder')}
                    rules={[{ required: enabled, message: t('settings.llm.api_key_required') }]}
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-base-url"
                    label={t('settings.llm.base_url')}
                    placeholder="https://api.openai.com/v1"
                    rules={[{ required: enabled, message: t('settings.llm.base_url_required') }]}
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-proxy-url"
                    label={t('settings.llm.proxy_url')}
                    placeholder={t('settings.llm.proxy_url_placeholder')}
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-model"
                    label={t('settings.llm.model')}
                    placeholder="gpt-3.5-turbo"
                    rules={[{ required: enabled, message: t('settings.llm.model_required') }]}
                    disabled={!enabled}
                />

                <ProFormDigit
                    name="llm-temperature"
                    label={t('settings.llm.temperature')}
                    min={0}
                    max={2}
                    fieldProps={{
                        step: 0.1,
                        precision: 1
                    }}
                    initialValue={0.7}
                    disabled={!enabled}
                />

                <ProFormDigit
                    name="llm-max-tokens"
                    label={t('settings.llm.max_tokens')}
                    min={1}
                    initialValue={4096}
                    disabled={!enabled}
                />

                <Divider orientation="left">{t('settings.llm.shell_config')}</Divider>

                <ProFormSwitch
                    name="llm-shell-enabled"
                    label={t('settings.llm.shell_enable')}
                    disabled={!enabled}
                />

                <ProFormTextArea
                    name="llm-shell-prompt"
                    label={t('settings.llm.shell_prompt')}
                    placeholder={t('settings.llm.shell_prompt_placeholder')}
                    fieldProps={{
                        rows: 6,
                        autoSize: { minRows: 6, maxRows: 12 }
                    }}
                    disabled={!enabled}
                />

                {/*<Divider orientation="left">审计助手配置</Divider>*/}
                
                {/*<ProFormSwitch*/}
                {/*    name="llm-audit-enabled"*/}
                {/*    label="启用审计助手"*/}
                {/*    disabled={!enabled}*/}
                {/*/>*/}

                {/*<ProFormTextArea*/}
                {/*    name="llm-audit-prompt"*/}
                {/*    label="审计助手提示词"*/}
                {/*    placeholder="输入审计助手的提示词..."*/}
                {/*    fieldProps={{*/}
                {/*        rows: 6,*/}
                {/*        autoSize: { minRows: 6, maxRows: 12 }*/}
                {/*    }}*/}
                {/*    disabled={!enabled}*/}
                {/*/>*/}
            </ProForm>
        </div>
    );
};

export default LLMSetting;

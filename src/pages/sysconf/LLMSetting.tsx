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
            values['llm-shell-prompt'] = `你是一个 IT 运维助手，负责将用户的需求直接转换为 Linux shell 命令。

规则：

1. **只输出命令**，不要加任何说明、解释、Markdown 包裹或额外文字。
2. 如果存在多种写法，只输出最常用且安全的一种。
3. 使用 Bash 语法，确保在 Ubuntu/Debian/CentOS 等常见发行版中通用。
4. 对危险操作（如 \`rm -rf /\`、\`:(){:|:&};:\` 等），直接输出："该操作有风险，请谨慎执行"。
5. 如果用户输入不完整，自动补全为最常见、合理的完整命令。`;
        }

        if (!values['llm-audit-prompt']) {
            values['llm-audit-prompt'] = `你是一个专业的系统审计助手。请分析提供的日志、操作记录或系统信息，并给出专业的审计意见。

分析重点：
1. 安全风险识别
2. 异常行为检测
3. 合规性检查
4. 性能问题分析
5. 操作建议和改进方案

请对提供的信息进行全面分析，并提供详细的审计报告。`;
        }

        return values;
    };

    return (
        <div className={cn(isMobile && 'px-2')}>
            <Title level={5} style={{ marginTop: 0 }}>LLM 设置</Title>
            
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
                <Divider orientation="left">基础配置</Divider>
                <ProFormSwitch
                    name="llm-enabled"
                    label="启用LLM"
                    fieldProps={{
                        onChange: setEnabled
                    }}
                />
                
                <ProFormText.Password
                    name="llm-api-key"
                    label="API Key"
                    placeholder="输入您的API Key"
                    rules={[{ required: enabled, message: '请输入API Key' }]}
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-base-url"
                    label="Base URL"
                    placeholder="https://api.openai.com/v1"
                    rules={[{ required: enabled, message: '请输入Base URL' }]}
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-proxy-url"
                    label="网络代理"
                    placeholder="例如: http://127.0.0.1:7890"
                    disabled={!enabled}
                />

                <ProFormText
                    name="llm-model"
                    label="模型"
                    placeholder="gpt-3.5-turbo"
                    rules={[{ required: enabled, message: '请输入模型名称' }]}
                    disabled={!enabled}
                />

                <ProFormDigit
                    name="llm-temperature"
                    label="Temperature"
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
                    label="Max Tokens"
                    min={1}
                    initialValue={4096}
                    disabled={!enabled}
                />

                <Divider orientation="left">Shell助手配置</Divider>

                <ProFormSwitch
                    name="llm-shell-enabled"
                    label="启用Shell助手"
                    disabled={!enabled}
                />

                <ProFormTextArea
                    name="llm-shell-prompt"
                    label="Shell助手提示词"
                    placeholder="输入Shell助手的提示词..."
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

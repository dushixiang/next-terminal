import {App, Badge, Button, Card, Collapse, Descriptions, Flex, Space, Spin, Alert, Typography} from 'antd';
import {CopyOutlined, KeyOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import copy from 'copy-to-clipboard';
import {useQuery} from '@tanstack/react-query';
import accountApi from '@/api/account-api';
import {agentAccessSettingUrl, canAccessAgentSettings} from '@/utils/agent-access';

const AgentAccess = ({portal = false}: {portal?: boolean}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {message} = App.useApp();
    const infoQuery = useQuery({queryKey: ['info'], queryFn: accountApi.getUserInfo});
    const isAdmin = infoQuery.data?.type === 'admin' || infoQuery.data?.type === 'super-admin';
    const canViewSettings = !portal && canAccessAgentSettings(infoQuery.data, 'GET');
    const canEditSettings = !portal && canAccessAgentSettings(infoQuery.data, 'PUT');
    const settingsButton = canViewSettings ? <Button type="link" onClick={() => navigate(agentAccessSettingUrl)}>{t(canEditSettings ? 'agent_access.go_settings' : 'agent_access.view_settings')}</Button> : undefined;
    const origin = window.location.origin;
    const prompt = t('agent_access.prompt', {url: origin});
    const copyInstallation = () => {
        if (copy(prompt)) message.success(t('agent_access.copied'));
        else message.error(t('agent_access.copy_failed'));
    };
    const steps = [
        {
            title: t('agent_access.step_key'), description: t('agent_access.step_key_tip'),
            content: <Button icon={<KeyOutlined/>} onClick={() => navigate(`${portal ? '/x-info' : '/info'}?activeKey=access-token`)}>{t('agent_access.create_key')}</Button>,
        },
        {
            title: t('agent_access.step_configure'), description: t('agent_access.step_configure_tip'),
            content: <div className="rounded-lg bg-black/[0.03] px-4 py-3 dark:bg-white/[0.04]">
                <Typography.Text code copyable>NT_API_KEY</Typography.Text>
                <div className="mt-2"><Typography.Text type="secondary">{t('agent_access.config_hint')}</Typography.Text></div>
            </div>,
        },
        {
            title: t('agent_access.step_agent'), description: t('agent_access.step_agent_tip'),
            content: <Space orientation="vertical" size={12} className="w-full">
                <Button type="primary" icon={<CopyOutlined/>} onClick={copyInstallation}>{t('agent_access.copy_prompt')}</Button>
                <Typography.Text type="secondary">{t('agent_access.verify_tip')}</Typography.Text>
            </Space>,
        },
    ];
    if (infoQuery.isPending) return <Spin/>;
    if (infoQuery.isError) return <Alert type="error" showIcon title={t('agent_access.load_failed')} action={<Button onClick={() => infoQuery.refetch()}>{t('agent_access.retry')}</Button>}/>;
    const accessEnabled = infoQuery.data?.apiKeyAccessEnabled === true;
    const accessStatus = <Flex align="center" gap={8} wrap>
        <Badge status={accessEnabled ? 'success' : 'default'} text={t(accessEnabled ? 'agent_access.status_enabled' : 'agent_access.status_disabled')}/>
        {settingsButton}
    </Flex>;
    if (!accessEnabled) return <div className="max-w-4xl pb-6">{accessStatus}</div>;
    return <Flex vertical gap={20} className="max-w-4xl pb-6">
        {canViewSettings && accessStatus}
        <Flex vertical gap={12}>
            {steps.map((step, index) => <Card key={index} size="small" styles={{body: {padding: 20}}}>
                <div className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 font-semibold text-blue-600 dark:text-blue-400">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                        <Typography.Title level={5} style={{marginTop: 2, marginBottom: 8}}>{step.title}</Typography.Title>
                        <Typography.Paragraph type="secondary">{step.description}</Typography.Paragraph>
                        {step.content}
                    </div>
                </div>
            </Card>)}
        </Flex>
        <Typography.Paragraph type="secondary" style={{marginBottom: 0}}>{t('agent_access.permissions')}</Typography.Paragraph>
        <Collapse ghost items={[
            {key: 'instructions', label: t('agent_access.preview_prompt'), children: <Typography.Paragraph copyable style={{whiteSpace: 'pre-wrap'}}>{prompt}</Typography.Paragraph>},
            ...(isAdmin ? [{key: 'advanced', label: t('agent_access.advanced'), children: <div className="flex flex-col gap-4">
                <Typography.Paragraph type="secondary" style={{marginBottom: 0}}>{t('agent_access.advanced_tip')}</Typography.Paragraph>
                <Descriptions size="small" column={1} items={[
                    {key: 'base', label: t('agent_access.base_url'), children: <Typography.Text copyable>{`${origin}/api`}</Typography.Text>},
                    {key: 'spec', label: t('agent_access.spec_url'), children: <Typography.Text copyable>{`${origin}/swagger/doc.json`}</Typography.Text>},
                    {key: 'auth', label: t('agent_access.auth'), children: <Typography.Text code>X-Auth-Token: &lt;API Key&gt;</Typography.Text>},
                ]}/>
                <div>
                    <Space size={[8, 8]} wrap>
                        <Button href="/swagger/index.html" target="_blank" rel="noopener noreferrer">OpenAPI</Button>

                    </Space>
                </div>
            </div>}] : []),
        ]}/>
    </Flex>;
};
export default AgentAccess;

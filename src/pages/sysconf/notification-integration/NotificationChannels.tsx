import {useEffect, useState} from "react";
import {App, Button, Card, Collapse, Form, Input, InputNumber, Select, Space, Spin, Switch, Tag, Typography, theme} from "antd";
import {
    AppWindow,
    BellRing,
    Building2,
    ExternalLink,
    Mail,
    MessageSquare,
    Save,
    Send,
    Webhook,
    type LucideIcon,
} from "lucide-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {notificationChannelApi, NotificationChannel, notificationRecipientApi} from "@/api/notification-api";
import {
    channelDocumentLinks,
    channelTypeLabel,
    channelTypes,
    notificationLanguages,
    robotWebhookPlaceholders
} from "./constants";
import {useTranslation} from "react-i18next";

import PersonalNotificationBindings from "./PersonalNotificationBindings";

const hiddenSecret = "******";

const channelIcons: Record<string, LucideIcon> = {
    mail: Mail,
    wecom: Building2,
    wecomApp: AppWindow,
    feishu: MessageSquare,
    dingtalk: BellRing,
    webhook: Webhook,
};

const NotificationChannels = () => {
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    const {token} = theme.useToken();
    const queryClient = useQueryClient();
    const [selectedType, setSelectedType] = useState(channelTypes[0]);
    const [enabledDrafts, setEnabledDrafts] = useState<Record<string, boolean>>({});

    const channelsQuery = useQuery({
        queryKey: ['notification-channels'],
        queryFn: notificationChannelApi.getAll,
    });

    const saveMutation = useMutation({
        mutationFn: async (values: NotificationChannel) => {
            await notificationChannelApi.updateById(values.type, values);
        },
        onSuccess: async (_, values) => {
            message.success(t('general.success'));
            await queryClient.invalidateQueries({queryKey: ['notification-channels']});
            setEnabledDrafts(current => {
                const next = {...current};
                delete next[values.type];
                return next;
            });
        },
    });

    const testMutation = useMutation({
        mutationFn: notificationChannelApi.test,
        onSuccess: async (result) => {
            message.success(t('settings.notification.test_success'));
            modal.info({
                title: t('settings.notification.result'),
                content: (
                    <Typography.Paragraph copyable={!!result} style={{whiteSpace: 'pre-wrap', marginBottom: 0}}>
                        {result || '-'}
                    </Typography.Paragraph>
                ),
            });
            await queryClient.invalidateQueries({queryKey: ['notification-channels']});
        },
    });

    if (channelsQuery.isLoading) {
        return <div className="flex justify-center py-10"><Spin/></div>;
    }

    const channels = channelsQuery.data || [];
    const sortedChannels = channelTypes.map(type => channels.find(channel => channel.type === type) || {
        type,
        enabled: false,
        config: {language: 'zh-CN'},
        secretConfig: {},
        createdAt: 0,
        updatedAt: 0,
    });
    const selectedChannel = sortedChannels.find(channel => channel.type === selectedType) || sortedChannels[0];

    return <div className="grid items-start gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card styles={{body: {padding: 12}}}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                {sortedChannels.map(channel => {
                    const Icon = channelIcons[channel.type] || Webhook;
                    const selected = channel.type === selectedType;
                    const enabled = enabledDrafts[channel.type] ?? channel.enabled;
                    const savingChannel = saveMutation.isPending && saveMutation.variables?.type === channel.type;

                    return <div
                        key={channel.type}
                        className="flex min-w-0 items-center gap-2 rounded-md border p-2 transition-colors"
                        style={{
                            borderColor: selected ? token.colorPrimaryBorder : 'transparent',
                            background: selected ? token.colorPrimaryBg : undefined,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedType(channel.type)}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
                        >
                            <span
                                className="flex size-9 shrink-0 items-center justify-center rounded-md"
                                style={{
                                    color: selected ? token.colorPrimary : token.colorTextSecondary,
                                    background: selected ? token.colorBgContainer : token.colorFillSecondary,
                                }}
                            >
                                <Icon size={16}/>
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium" style={{color: token.colorText}}>
                                    {channelTypeLabel(channel.type, t)}
                                </span>
                                <span className="mt-0.5 block truncate text-xs" style={{color: token.colorTextDescription}}>
                                    {t(enabled ? 'general.enabled' : 'general.disabled')}
                                </span>
                            </span>
                        </button>
                        <Switch
                            size="small"
                            checked={enabled}
                            loading={savingChannel}
                            disabled={saveMutation.isPending}
                            aria-label={`${t(enabled ? 'general.disabled' : 'general.enabled')} ${channelTypeLabel(channel.type, t)}`}
                            onChange={enabled => {
                                setSelectedType(channel.type);
                                setEnabledDrafts(current => ({...current, [channel.type]: enabled}));
                            }}
                        />
                    </div>;
                })}
            </div>
        </Card>

        <div className="min-w-0">
            {sortedChannels.map(channel => <div
                key={channel.type}
                className={channel.type === selectedChannel.type ? undefined : 'hidden'}
            >
                <NotificationChannelPanel
                    channel={channel}
                    enabled={enabledDrafts[channel.type] ?? channel.enabled}
                    saveLoading={saveMutation.isPending}
                    testLoading={testMutation.isPending}
                    onSave={saveMutation.mutate}
                    onTest={testMutation.mutate}
                />
            </div>)}
        </div>
    </div>;
};

const NotificationChannelPanel = ({
                                      channel,
                                      enabled,
                                      saveLoading,
                                      testLoading,
                                      onSave,
                                      onTest,
                                  }: {
    channel: NotificationChannel;
    enabled: boolean;
    saveLoading: boolean;
    testLoading: boolean;
    onSave: (channel: NotificationChannel) => void;
    onTest: (type: string) => void;
}) => {
    const {t} = useTranslation();
    const {token} = theme.useToken();
    const [form] = Form.useForm();
    const isMail = channel.type === 'mail';
    const isWebhook = channel.type === 'webhook';
    const isWeComApp = channel.type === 'wecomApp';
    const [testUser, setTestUser] = useState<string>();
    const [personalTestOpen, setPersonalTestOpen] = useState(false);
    const {message} = App.useApp();
    const recipients = useQuery({queryKey: ['notification-recipients'], queryFn: notificationRecipientApi.getAll, enabled: isMail && personalTestOpen});
    const personalTest = useMutation({mutationFn: (userId: string) => notificationRecipientApi.test(channel.type, userId), onSuccess: () => message.success(t('settings.notification.test_success'))});
    const showSecret = channel.type === 'feishu' || channel.type === 'dingtalk' || channel.type === 'webhook';
    const Icon = channelIcons[channel.type] || Webhook;

    const validateWebhookUrl = (_: unknown, value?: string) => {
        if (!value || value === hiddenSecret) {
            return Promise.resolve();
        }
        try {
            const url = new URL(value);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return Promise.reject(new Error(t('settings.notification.webhook_url_invalid')));
            }
            return Promise.resolve();
        } catch {
            return Promise.reject(new Error(t('settings.notification.webhook_url_invalid')));
        }
    };

    useEffect(() => {
        form.setFieldsValue({
            config: channel.config || {},
            secretConfig: channel.secretConfig || {},
        });
    }, [channel, form]);

    const handleSave = async () => {
        const values = enabled ? await form.validateFields() : form.getFieldsValue(true);
        onSave({
            ...channel,
            enabled,
            config: values.config || {},
            secretConfig: values.secretConfig || {},
        });
    };

    return <Form form={form} layout="vertical">
        <Card styles={{body: {padding: 0}}}>
            <div
                className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                style={{borderBottom: `1px solid ${token.colorBorderSecondary}`}}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-md"
                        style={{background: token.colorPrimaryBg, color: token.colorPrimary}}
                    >
                        <Icon size={20}/>
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Typography.Title level={5} style={{margin: 0}}>
                                {channelTypeLabel(channel.type, t)}
                            </Typography.Title>
                            <Tag color={enabled ? 'success' : 'default'}>
                                {t(enabled ? 'general.enabled' : 'general.disabled')}
                            </Tag>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {channelDocumentLinks[channel.type] && <Button
                        icon={<ExternalLink size={14}/>}
                        href={channelDocumentLinks[channel.type]}
                        target="_blank"
                    >
                        {t('settings.notification.access_document')}
                    </Button>}
                    <Button
                        icon={<Send size={14}/>}
                        loading={testLoading}
                        disabled={!enabled || enabled !== channel.enabled || saveLoading}
                        onClick={() => onTest(channel.type)}
                    >
                        {t('settings.notification.test')}
                    </Button>
                    <Button
                        type="primary"
                        icon={<Save size={14}/>}
                        loading={saveLoading}
                        onClick={handleSave}
                    >
                        {t('actions.save')}
                    </Button>
                </div>
            </div>

            <div className="p-4 sm:p-6">
                {!enabled && <div
                    className="mb-5 flex items-center gap-2 rounded-md border px-3.5 py-3 text-sm"
                    style={{
                        borderColor: token.colorBorderSecondary,
                        background: token.colorFillQuaternary,
                        color: token.colorTextSecondary,
                    }}
                >
                    <span className="size-1.5 shrink-0 rounded-full" style={{background: token.colorTextQuaternary}}/>
                    {t('settings.notification.enable_to_configure')}
                </div>}

                <div className={!enabled ? 'pointer-events-none opacity-50' : undefined}>
                    <Typography.Paragraph type="secondary">{t(isMail ? 'settings.notification.mail_fixed_tip' : isWeComApp ? 'settings.notification.supports_personal' : 'settings.notification.channel_only')}</Typography.Paragraph>
                    <Form.Item name={['config', 'language']} label={t('settings.notification.language')}>
                        <Select disabled={!enabled} options={notificationLanguages.map(item => ({
                            label: t(`settings.notification.languages.${item}`, item),
                            value: item,
                        }))}/>
                    </Form.Item>
                    {isMail && <Form.Item
                        name={['config', 'recipient']}
                        label={t('settings.notification.recipients')}
                        rules={[{required: enabled, message: t('settings.notification.recipients_required')}]}
                    >
                        <Input.TextArea
                            disabled={!enabled}
                            rows={3}
                            placeholder={t('settings.notification.recipients_placeholder')}
                        />
                    </Form.Item>}
                    {isWeComApp && <>
                        <Form.Item
                            name={['config', 'origin']}
                            label={t('settings.notification.wecom_app_origin')}
                            initialValue="https://qyapi.weixin.qq.com"
                            rules={[{required: enabled, message: t('settings.notification.wecom_app_origin_required')}]}
                        >
                            <Input disabled={!enabled} autoComplete="off" placeholder="https://qyapi.weixin.qq.com"/>
                        </Form.Item>
                        <Form.Item
                            name={['config', 'corpId']}
                            label={t('settings.notification.wecom_app_corp_id')}
                            rules={[{required: enabled, message: t('settings.notification.wecom_app_corp_id_required')}]}
                        >
                            <Input disabled={!enabled} autoComplete="off" placeholder={t('settings.notification.wecom_app_corp_id_placeholder')}/>
                        </Form.Item>
                        <Form.Item
                            name={['secretConfig', 'corpSecret']}
                            label={t('settings.notification.wecom_app_corp_secret')}
                            rules={[{required: enabled, message: t('settings.notification.wecom_app_corp_secret_required')}]}
                        >
                            <Input.Password disabled={!enabled} autoComplete="new-password" placeholder={t('settings.notification.wecom_app_corp_secret_placeholder')}/>
                        </Form.Item>
                        <Form.Item
                            name={['config', 'agentId']}
                            label={t('settings.notification.wecom_app_agent_id')}
                            rules={[{required: enabled, message: t('settings.notification.wecom_app_agent_id_required')}]}
                        >
                            <InputNumber disabled={!enabled} style={{width: '100%'}} placeholder={t('settings.notification.wecom_app_agent_id_placeholder')}/>
                        </Form.Item>
                        <Form.Item
                            name={['config', 'toUser']}
                            label={t('settings.notification.wecom_app_to_user')}
                            extra={t('settings.notification.fixed_recipient_tip')}
                            initialValue="@all"
                            rules={[{required: enabled, message: t('settings.notification.wecom_app_to_user_required')}]}
                        >
                            <Input disabled={!enabled} autoComplete="off" placeholder={t('settings.notification.wecom_app_to_user_placeholder')}/>
                        </Form.Item>
                    </>}
                    {!isMail && !isWeComApp && <Form.Item
                        name={['secretConfig', 'webhookUrl']}
                        label={isWebhook ? t('settings.notification.webhook_url') : t('settings.notification.robot_webhook_url')}
                        rules={[
                            {required: enabled, message: t('settings.notification.webhook_url_required')},
                            {validator: validateWebhookUrl},
                        ]}
                    >
                        <Input disabled={!enabled} autoComplete="off" placeholder={robotWebhookPlaceholders[channel.type]}/>
                    </Form.Item>}
                    {showSecret && <Form.Item name={['secretConfig', 'secret']} label={t('settings.notification.sign_secret')}>
                        <Input.Password disabled={!enabled} autoComplete="new-password" placeholder="SEC..."/>
                    </Form.Item>}
                </div>
                {isMail && <Collapse ghost onChange={keys => setPersonalTestOpen(keys.length > 0)} items={[{
                    key: 'test', label: t('settings.notification.personal_test'), children: <Space wrap>
                        <Select style={{minWidth: 220}} value={testUser} onChange={setTestUser} showSearch={{optionFilterProp: 'label'}}
                            placeholder={t('settings.notification.recipient')} loading={recipients.isPending}
                            options={(recipients.data || []).map(user => ({value: user.id, label: user.name}))}/>
                        <Button disabled={!testUser} loading={personalTest.isPending} onClick={() => testUser && personalTest.mutate(testUser)}>{t('settings.notification.test')}</Button>
                    </Space>,
                }]}/>}
                {isWeComApp && <Collapse ghost items={[{key: 'bindings', label: t('settings.notification.binding_advanced'), children: <PersonalNotificationBindings/>}]}/>}
            </div>
        </Card>
    </Form>;
};

export default NotificationChannels;

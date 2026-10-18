import {useEffect, useState} from 'react';
import {
    Alert,
    App,
    Button,
    Checkbox,
    Divider,
    Empty,
    Form,
    Input,
    InputNumber,
    Modal,
    Radio,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {CheckCircleIcon, PencilIcon, PlusIcon, Trash2Icon} from 'lucide-react';
import type {SettingProps} from './SettingPage';
import AIProfileModal from './AIProfileModal';
import aiSettingsApi, {
    AI_SETTINGS_PROPERTY_KEY,
    DEFAULT_AI_PROFILE,
    getBuiltinPreset,
    type AISettings,
    type BuiltinAPIProfile,
    normalizeAISettings,
    parseAISettingsProperty,
    stringifyAISettingsProperty,
} from '@/api/ai-settings-api';

type ProfileModalState = {
    mode: 'add' | 'edit';
    profile: BuiltinAPIProfile;
};

const AISetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<AISettings>();
    const queryClient = useQueryClient();
    const [disclaimerModalOpen, setDisclaimerModalOpen] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [profileModal, setProfileModal] = useState<ProfileModalState | null>(null);
    const [profileSaving, setProfileSaving] = useState(false);
    const activeProfileId = Form.useWatch(['builtin', 'activeProfileId'], form) || '';
    const confirmMode = Form.useWatch('confirmMode', form);
    const approvalReviewProfileId = Form.useWatch('approvalReviewProfileId', form) || '';

    const query = useQuery({
        queryKey: ['settings', 'ai'],
        queryFn: async () => {
            const values = await get();
            return parseAISettingsProperty(values?.[AI_SETTINGS_PROPERTY_KEY]);
        },
    });

    const profilesQuery = useQuery({
        queryKey: ['ai', 'profiles'],
        queryFn: aiSettingsApi.profiles,
    });

    const profiles = profilesQuery.data || [];

    useEffect(() => {
        if (query.data) {
            form.setFieldsValue(query.data);
        }
    }, [form, query.data]);

    const mutation = useMutation({
        mutationFn: async (values: AISettings) => {
            const next = normalizeAISettings(values);
            const ok = await set({
                [AI_SETTINGS_PROPERTY_KEY]: stringifyAISettingsProperty(next),
            });
            if (ok === false) {
                return null;
            }
            return next;
        },
        onSuccess: (data) => {
            if (!data) {
                return;
            }
            queryClient.setQueryData(['settings', 'ai'], data);
            message.success(t('general.success'));
        },
    });

    const handleFinish = () => {
        mutation.mutate(form.getFieldsValue(true) as AISettings);
    };

    const handleEnabledChange = (checked: boolean) => {
        if (!checked) {
            form.setFieldsValue({
                enabled: false,
                disclaimerAccepted: false,
            });
            return;
        }
        if (form.getFieldValue('disclaimerAccepted') === true) {
            form.setFieldValue('enabled', true);
            return;
        }
        form.setFieldValue('enabled', false);
        setDisclaimerChecked(false);
        setDisclaimerModalOpen(true);
    };

    const handleDisclaimerOk = () => {
        if (!disclaimerChecked) {
            message.warning(t('settings.ai.disclaimer_required'));
            return;
        }
        form.setFieldsValue({
            enabled: true,
            disclaimerAccepted: true,
        });
        setDisclaimerModalOpen(false);
    };

    const buildProfile = () => {
        const usedIds = new Set(profiles.map(item => item?.id).filter(Boolean));
        let index = profiles.length + 1;
        let id = `profile-${index}`;
        while (usedIds.has(id)) {
            index += 1;
            id = `profile-${index}`;
        }
        return {
            ...DEFAULT_AI_PROFILE,
            id,
            name: `${t('settings.ai.profile')} ${index}`,
            model: '',
            models: [],
        };
    };

    const openAddProfile = () => {
        setProfileModal({mode: 'add', profile: buildProfile()});
    };

    const openEditProfile = (profile: BuiltinAPIProfile) => {
        setProfileModal({mode: 'edit', profile});
    };

    const saveActiveProfileId = async (profileId: string, showMessage = true) => {
        const currentSettings = form.getFieldsValue(true) as AISettings;
        const nextSettings = {
            ...currentSettings,
            builtin: {
                ...currentSettings.builtin,
                activeProfileId: profileId,
                profiles: [],
            },
        };
        const next = normalizeAISettings(nextSettings);
        const ok = await set({
            [AI_SETTINGS_PROPERTY_KEY]: stringifyAISettingsProperty(next),
        });
        if (ok === false) {
            return null;
        }
        queryClient.setQueryData(['settings', 'ai'], next);
        form.setFieldsValue(next);
        if (showMessage) {
            message.success(t('general.success'));
        }
        return next;
    };

    const handleSaveProfile = async (profile: BuiltinAPIProfile) => {
        try {
            setProfileSaving(true);
            if (profileModal?.mode === 'edit') {
                await aiSettingsApi.updateProfile(profile.id, profile);
            } else {
                const savedProfile = await aiSettingsApi.createProfile(profile);
                await saveActiveProfileId(savedProfile.id, false);
            }
            await queryClient.invalidateQueries({queryKey: ['ai', 'profiles']});
            message.success(t('general.success'));
            setProfileModal(null);
        } finally {
            setProfileSaving(false);
        }
    };

    const handleRemoveProfile = async (index: number) => {
        const removedProfile = profiles[index];
        if (!removedProfile) {
            return;
        }
        await aiSettingsApi.deleteProfile(removedProfile.id);
        if (removedProfile.id === activeProfileId) {
            const nextProfile = profiles.find((_, itemIndex) => itemIndex !== index);
            await saveActiveProfileId(nextProfile?.id || '', false);
        }
        await queryClient.invalidateQueries({queryKey: ['ai', 'profiles']});
        message.success(t('general.success'));
    };

    const setActiveProfile = async (profile: BuiltinAPIProfile) => {
        if (profile.id === activeProfileId) {
            return;
        }
        await saveActiveProfileId(profile.id);
    };

    const renderProfileCards = () => {
        if (profiles.length === 0) {
            return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('settings.ai.profile_empty')}/>;
        }
        return (
            <Radio.Group
                className="w-full"
                name="active-ai-profile"
                value={activeProfileId}
                onChange={(event) => {
                    const profile = profiles.find(item => item.id === event.target.value);
                    if (profile) void setActiveProfile(profile);
                }}
            >
                <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
                    {profiles.map((profile, index) => {
                        const active = profile.id === activeProfileId;
                        const preset = getBuiltinPreset(profile.presetId);
                        const apiType = profile.apiType === 'anthropic'
                            ? t('settings.ai.api_type_anthropic')
                            : profile.apiType === 'openai_responses'
                                ? t('settings.ai.api_type_openai_responses')
                                : t('settings.ai.api_type_openai');
                        return (
                            <div
                                key={profile.id || index}
                                className={[
                                    'min-w-0 rounded-lg border p-4 transition-[border-color,background-color,box-shadow]',
                                    active
                                        ? 'border-blue-400/70 bg-blue-50/60 shadow-sm dark:border-blue-500/60 dark:bg-blue-950/20'
                                        : 'border-gray-200/70 dark:border-white/10',
                                ].join(' ')}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <Radio
                                        aria-label={`${t('settings.ai.profile_active')}: ${profile.name || preset.name}`}
                                        className="!m-0 !mt-1 shrink-0"
                                        value={profile.id}
                                    />
                                    <button
                                        type="button"
                                        className="min-w-0 flex-1 rounded-sm text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                                        onClick={() => void setActiveProfile(profile)}
                                    >
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="min-w-0 truncate font-semibold">{profile.name || preset.name}</span>
                                            {active ? (
                                                <Tag color="blue">
                                                    <span className="inline-flex items-center gap-1 leading-none">
                                                        <CheckCircleIcon size={12}/>
                                                        <span>{t('settings.ai.profile_active')}</span>
                                                    </span>
                                                </Tag>
                                            ) : null}
                                        </div>
                                        <div className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{preset.name} · {apiType}</div>
                                    </button>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Tooltip title={t('actions.edit')}>
                                            <Button
                                                aria-label={t('actions.edit')}
                                                size="small"
                                                icon={<PencilIcon size={14}/>}
                                                onClick={() => openEditProfile(profile)}
                                            />
                                        </Tooltip>
                                        <Tooltip title={t('actions.delete')}>
                                            <Button
                                                aria-label={t('actions.delete')}
                                                size="small"
                                                danger
                                                icon={<Trash2Icon size={14}/>}
                                                disabled={profiles.length <= 1}
                                                onClick={() => void handleRemoveProfile(index)}
                                            />
                                        </Tooltip>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-2 rounded-md bg-black/[0.025] px-3 py-2.5 text-xs dark:bg-white/[0.04]">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="shrink-0 text-gray-500 dark:text-gray-400">{t('settings.ai.model')}</span>
                                        <span className="min-w-0 flex-1 truncate text-right font-medium" title={profile.model || '-'}>{profile.model || '-'}</span>
                                        <span className="shrink-0 text-gray-500 dark:text-gray-400">{t('settings.ai.model_count', {count: profile.models?.length || 0})}</span>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="shrink-0 text-gray-500 dark:text-gray-400">{t('settings.ai.base_url')}</span>
                                        <span className="min-w-0 flex-1 truncate text-right font-mono text-gray-600 dark:text-gray-300" title={profile.baseUrl}>{profile.baseUrl || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Radio.Group>
        );
    };

    const approvalReviewProfile = profiles.find(profile => profile.id === approvalReviewProfileId)
        || profiles.find(profile => profile.id === activeProfileId)
        || profiles[0];
    const approvalReviewModels = Array.from(new Set([
        form.getFieldValue('approvalReviewModel'),
        approvalReviewProfile?.model,
        ...(approvalReviewProfile?.models || []),
    ].filter((item): item is string => typeof item === 'string' && item.trim() !== '')));
    const commandPolicies = [
        {
            value: 'auto',
            title: t('settings.ai.command_policy_auto'),
            description: t('settings.ai.command_policy_auto_description'),
            detail: t('settings.ai.command_policy_auto_detail'),
            risk: t('settings.ai.command_policy_risk_high'),
            riskColor: 'red',
        },
        {
            value: 'auto_review',
            title: t('settings.ai.command_policy_auto_review'),
            description: t('settings.ai.command_policy_auto_review_description'),
            detail: t('settings.ai.command_policy_auto_review_detail'),
            risk: t('settings.ai.command_policy_risk_managed'),
            riskColor: 'orange',
        },
        {
            value: 'balanced',
            title: t('settings.ai.command_policy_balanced'),
            description: t('settings.ai.command_policy_balanced_description'),
            detail: t('settings.ai.command_policy_balanced_detail'),
            risk: t('settings.ai.command_policy_risk_low'),
            riskColor: 'blue',
            recommended: true,
        },
        {
            value: 'always',
            title: t('settings.ai.command_policy_always'),
            description: t('settings.ai.command_policy_always_description'),
            detail: t('settings.ai.command_policy_always_detail'),
            risk: t('settings.ai.command_policy_risk_safest'),
            riskColor: 'green',
        },
    ];

    return (
        <Spin spinning={query.isLoading || profilesQuery.isLoading}>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item name={['builtin', 'activeProfileId']} hidden>
                    <Input/>
                </Form.Item>
                <Form.Item name="disclaimerAccepted" valuePropName="checked" hidden>
                    <Checkbox/>
                </Form.Item>
                <Form.Item name="enabled" label={t('settings.ai.enabled')} valuePropName="checked">
                    <Switch
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                        onChange={handleEnabledChange}
                    />
                </Form.Item>
                <div className="mb-6">
                    <Alert
                        type="info"
                        showIcon
                        title={t('settings.ai.asset_enable_tip')}
                    />
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                    <Typography.Title level={5} className="!mb-0">{t('settings.ai.profile')}</Typography.Title>
                    <Button icon={<PlusIcon size={16}/>} onClick={openAddProfile}>
                        {t('settings.ai.add_profile')}
                    </Button>
                </div>
                {renderProfileCards()}

                <Divider titlePlacement="start">{t('settings.ai.behavior')}</Divider>
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                        <Form.Item
                            name="confirmMode"
                            label={t('settings.ai.command_policy')}
                            extra={t('settings.ai.command_policy_tip')}
                        >
                            <Radio.Group className="w-full">
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    {commandPolicies.map(policy => (
                                        <Radio
                                            key={policy.value}
                                            value={policy.value}
                                            className={[
                                                '!m-0 !flex w-full !items-start rounded-lg border !p-4 transition-[border-color,background-color,box-shadow]',
                                                confirmMode === policy.value
                                                    ? 'border-blue-400/70 bg-blue-50/60 shadow-sm dark:border-blue-500/60 dark:bg-blue-950/20'
                                                    : 'border-gray-200/70 hover:border-blue-300/80 hover:bg-gray-50/60 dark:border-white/10 dark:hover:border-blue-600/70 dark:hover:bg-white/[0.03]',
                                            ].join(' ')}
                                        >
                                            <div className="min-w-0 pl-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Typography.Text strong>{policy.title}</Typography.Text>
                                                    <Tag color={policy.riskColor}>{policy.risk}</Tag>
                                                    {policy.recommended ? <Tag color="blue">{t('settings.ai.command_policy_recommended')}</Tag> : null}
                                                </div>
                                                <div className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">{policy.description}</div>
                                                <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{policy.detail}</div>
                                            </div>
                                        </Radio>
                                    ))}
                                </div>
                            </Radio.Group>
                        </Form.Item>
                    </div>
                    <Form.Item
                        label={t('settings.ai.command_timeout')}
                        extra={t('settings.ai.command_timeout_tip')}
                    >
                        <Space.Compact>
                            <Form.Item name="commandTimeoutSecs" noStyle>
                                <InputNumber min={5} max={300} precision={0} style={{width: 140}}/>
                            </Form.Item>
                            <Space.Addon>{t('general.second')}</Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                    {confirmMode === 'auto_review' ? (
                        <div className="mb-6 rounded-lg border border-orange-200/80 bg-orange-50/40 p-4 lg:col-span-2 dark:border-orange-900/60 dark:bg-orange-950/10">
                            <Typography.Text strong>{t('settings.ai.approval_review_settings')}</Typography.Text>
                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('settings.ai.approval_review_settings_tip')}</div>
                            <div className="mt-4 grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                                <Form.Item
                                    name="approvalReviewProfileId"
                                    label={t('settings.ai.approval_review_profile')}
                                    extra={t('settings.ai.approval_review_profile_tip')}
                                >
                                    <Select
                                        allowClear
                                        placeholder={t('settings.ai.follow_conversation_profile')}
                                        options={profiles.map(profile => ({label: profile.name || profile.baseUrl, value: profile.id}))}
                                        onChange={() => form.setFieldValue('approvalReviewModel', '')}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="approvalReviewModel"
                                    label={t('settings.ai.approval_review_model')}
                                    extra={t('settings.ai.approval_review_model_tip')}
                                >
                                    <Select
                                        allowClear
                                        showSearch={{optionFilterProp: 'label'}}
                                        placeholder={t('settings.ai.follow_conversation_model')}
                                        options={approvalReviewModels.map(model => ({label: model, value: model}))}
                                    />
                                </Form.Item>
                                <Form.Item
                                    label={t('settings.ai.approval_review_timeout')}
                                    extra={t('settings.ai.approval_review_timeout_tip')}
                                >
                                    <Space.Compact>
                                        <Form.Item name="approvalReviewTimeoutSecs" noStyle>
                                            <InputNumber min={10} max={300} precision={0} style={{width: 140}}/>
                                        </Form.Item>
                                        <Space.Addon>{t('general.second')}</Space.Addon>
                                    </Space.Compact>
                                </Form.Item>
                            </div>
                        </div>
                    ) : null}
                </div>

                <Form.Item
                    name="includeHostRemark"
                    label={t('settings.ai.include_host_remark')}
                    valuePropName="checked"
                    extra={t('settings.ai.include_host_remark_tip')}
                >
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
                <Form.Item
                    name="customSystemPrompt"
                    label={t('settings.ai.custom_system_prompt')}
                    extra={t('settings.ai.custom_system_prompt_tip')}
                >
                    <Input.TextArea rows={5} maxLength={8000} showCount/>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                        {t('actions.save')}
                    </Button>
                </Form.Item>
            </Form>

            {profileModal ? (
                <AIProfileModal
                    mode={profileModal.mode}
                    open={!!profileModal}
                    profile={profileModal.profile}
                    confirmLoading={profileSaving}
                    onCancel={() => setProfileModal(null)}
                    onSave={handleSaveProfile}
                />
            ) : null}

            <Modal
                title={t('settings.ai.disclaimer_title')}
                open={disclaimerModalOpen}
                onOk={handleDisclaimerOk}
                onCancel={() => setDisclaimerModalOpen(false)}
            >
                <Typography.Paragraph>{t('settings.ai.disclaimer_description')}</Typography.Paragraph>
                <Checkbox checked={disclaimerChecked} onChange={event => setDisclaimerChecked(event.target.checked)}>
                    {t('settings.ai.disclaimer_accepted')}
                </Checkbox>
            </Modal>
        </Spin>
    );
};

export default AISetting;

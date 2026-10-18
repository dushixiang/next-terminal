import {useEffect} from 'react';
import {App, Button, Form, Input, InputNumber, Modal, Select, Space, Typography} from 'antd';
import {useMutation} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {PlusIcon, RefreshCwIcon, Trash2Icon} from 'lucide-react';
import aiSettingsApi, {
    AI_BUILTIN_PROVIDER_PRESETS,
    AI_CONTEXT_WINDOW_MAX,
    AI_MAX_OUTPUT_TOKENS,
    DEFAULT_AI_PROFILE,
    getBuiltinPreset,
    type AIBuiltinAPIType,
    type AIBuiltinPresetId,
    type BuiltinAPIProfile,
} from '@/api/ai-settings-api';

type AIProfileModalProps = {
    mode: 'add' | 'edit';
    open: boolean;
    profile?: BuiltinAPIProfile;
    confirmLoading?: boolean;
    onCancel: () => void;
    onSave: (profile: BuiltinAPIProfile) => Promise<void> | void;
};

type ProfileFormValues = Omit<BuiltinAPIProfile, 'customRequestBody'> & {
    customRequestBodyText: string;
};

const uniqueModels = (models?: string[], activeModel?: string) => Array.from(new Set([
    activeModel,
    ...((models || []).map(item => `${item}`.trim())),
].filter((item): item is string => typeof item === 'string' && item.trim() !== '')));

const profileToForm = (profile: BuiltinAPIProfile): ProfileFormValues => ({
    ...profile,
    customRequestBodyText: JSON.stringify(profile.customRequestBody || {}, null, 2),
});

const AIProfileModal = ({mode, open, profile, confirmLoading, onCancel, onSave}: AIProfileModalProps) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<ProfileFormValues>();
    const apiType = Form.useWatch('apiType', form) || profile?.apiType || 'openai';
    const presetId = Form.useWatch('presetId', form) || profile?.presetId || 'openai';
    const activeModel = Form.useWatch('model', form) || profile?.model || '';
    const modelList = Form.useWatch('models', form) || profile?.models || [];
    const preset = getBuiltinPreset(presetId);
    const modelOptions = uniqueModels(modelList, activeModel);

    useEffect(() => {
        if (open && profile) {
            form.setFieldsValue(profileToForm(profile));
        } else {
            form.resetFields();
        }
    }, [form, open, profile]);

    const cleanProfile = (values: ProfileFormValues): BuiltinAPIProfile => {
        const models = uniqueModels(values.models, values.model);
        const model = values.model?.trim() || models[0] || '';
        let customRequestBody: Record<string, unknown> = {};
        if (values.apiType !== 'anthropic') {
            customRequestBody = JSON.parse(values.customRequestBodyText || '{}') as Record<string, unknown>;
        }
        return {
            ...DEFAULT_AI_PROFILE,
            ...values,
            id: values.id?.trim() || profile?.id || DEFAULT_AI_PROFILE.id,
            name: values.name?.trim() || getBuiltinPreset(values.presetId).name,
            baseUrl: values.baseUrl?.trim().replace(/\/+$/, '') || getBuiltinPreset(values.presetId).baseUrl,
            apiKey: values.apiKey?.trim() || '',
            model,
            models: models.includes(model) ? models : [model, ...models].filter(Boolean),
            customRequestBody,
            userAgent: values.userAgent?.trim() || '',
            httpProxy: values.httpProxy?.trim() || '',
        };
    };

    const loadModelsMutation = useMutation({
        mutationFn: async (item: BuiltinAPIProfile) => await aiSettingsApi.models(item),
        onSuccess: (models) => {
            if (models.length === 0) {
                message.warning(t('settings.ai.models_empty'));
                return;
            }
            const currentModel = form.getFieldValue('model');
            form.setFieldsValue({model: currentModel && models.includes(currentModel) ? currentModel : models[0], models});
            message.success(t('settings.ai.models_loaded'));
        },
        onError: (error) => {
            message.error(error instanceof Error ? error.message : t('settings.ai.models_load_failed'));
        },
    });

    const handlePresetChange = (nextPresetId: AIBuiltinPresetId) => {
        const previousPreset = getBuiltinPreset(form.getFieldValue('presetId'));
        const nextPreset = getBuiltinPreset(nextPresetId);
        const currentName = form.getFieldValue('name') || '';
        form.setFieldsValue({
            name: currentName.trim() === '' || currentName === previousPreset.name ? nextPreset.name : currentName,
            presetId: nextPreset.id,
            apiType: nextPreset.apiType || form.getFieldValue('apiType') || 'openai',
            baseUrl: nextPreset.baseUrl,
            apiKey: '',
            model: nextPreset.model,
            models: nextPreset.models.length > 0 ? nextPreset.models : [],
            customRequestBodyText: '{}',
        });
    };

    const handleAPITypeChange = (nextAPIType: AIBuiltinAPIType) => {
        const values: Partial<ProfileFormValues> = {apiType: nextAPIType};
        if (nextAPIType === 'anthropic' && form.getFieldValue('baseUrl') === 'https://api.openai.com/v1') {
            values.baseUrl = 'https://api.anthropic.com';
        }
        form.setFieldsValue(values);
    };

    const handleModelsChange = () => {
        const nextModels = uniqueModels(form.getFieldValue('models'));
        const currentModel = form.getFieldValue('model') || '';
        form.setFieldsValue({models: nextModels, model: nextModels.includes(currentModel) ? currentModel : nextModels[0] || ''});
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        await onSave(cleanProfile(values));
    };

    const loadModalModels = async () => {
        try {
            const values = form.getFieldsValue(true) as ProfileFormValues;
            const item = cleanProfile(values);
            if (!item.baseUrl || (mode === 'add' && item.presetId !== 'ollama' && !item.apiKey)) {
                message.warning(t('settings.ai.models_load_config_required'));
                return;
            }
            loadModelsMutation.mutate(item);
        } catch {
            message.warning(t('settings.ai.custom_request_body_invalid'));
        }
    };

    return (
        <Modal
            title={mode === 'add' ? t('settings.ai.new_profile') : t('settings.ai.edit_profile')}
            open={open}
            onOk={handleSave}
            onCancel={onCancel}
            okText={t('actions.save')}
            confirmLoading={confirmLoading}
            width={820}
            destroyOnHidden
        >
            <Form form={form} layout="vertical">
                <Form.Item name="id" hidden><Input/></Form.Item>
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                    <Form.Item name="name" label={t('settings.ai.profile_name')} rules={[{required: true, message: t('general.required')}]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item name="presetId" label={t('settings.ai.api_preset')} rules={[{required: true, message: t('general.required')}]}>
                        <Select options={AI_BUILTIN_PROVIDER_PRESETS.map(item => ({label: item.name, value: item.id}))} onChange={handlePresetChange}/>
                    </Form.Item>
                    <Form.Item name="apiType" label={t('settings.ai.api_type')} rules={[{required: true, message: t('general.required')}]} extra={t('settings.ai.api_type_tip')}>
                        <Select
                            options={[
                                {label: t('settings.ai.api_type_openai'), value: 'openai'},
                                {label: t('settings.ai.api_type_openai_responses'), value: 'openai_responses'},
                                {label: t('settings.ai.api_type_anthropic'), value: 'anthropic'},
                            ]}
                            onChange={handleAPITypeChange}
                        />
                    </Form.Item>
                    <Form.Item name="baseUrl" label={t('settings.ai.base_url')} rules={[{required: true, message: t('general.required')}]} extra={apiType === 'anthropic' ? t('settings.ai.base_url_anthropic_tip') : t('settings.ai.base_url_tip')}>
                        <Input placeholder={apiType === 'anthropic' ? 'https://api.anthropic.com' : preset.baseUrl || 'https://api.openai.com/v1'}/>
                    </Form.Item>
                    <Form.Item name="apiKey" label="API Key" required={mode === 'add' && presetId !== 'ollama'} extra={mode === 'edit' ? t('settings.ai.api_key_edit_tip') : undefined}>
                        <Input.Password autoComplete="new-password"/>
                    </Form.Item>
                    <Form.Item label={t('settings.ai.model')} required>
                        <Space.Compact block>
                            <Form.Item name="model" noStyle rules={[{required: true, message: t('general.required')}]}>
                                <Select allowClear showSearch placeholder="gpt-4o-mini" options={modelOptions.map(item => ({label: item, value: item}))}/>
                            </Form.Item>
                            <Space.Addon className="!p-0">
                                <Button type="text" icon={<RefreshCwIcon size={16}/>} loading={loadModelsMutation.isPending} onClick={loadModalModels}>
                                    {t('settings.ai.load_models')}
                                </Button>
                            </Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                </div>

                <Form.Item label={t('settings.ai.models')} extra={t('settings.ai.models_tip')}>
                    <Form.List name="models">
                        {(fields, {add, remove}) => (
                            <div className="grid gap-2">
                                {fields.map(field => (
                                    <div key={field.key} className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1">
                                            <Form.Item name={field.name} noStyle><Input placeholder="gpt-4o-mini" onBlur={handleModelsChange}/></Form.Item>
                                        </div>
                                        <Button danger aria-label={t('actions.delete')} className="shrink-0" icon={<Trash2Icon size={16}/>} disabled={fields.length <= 1} onClick={() => {
                                            remove(field.name);
                                            setTimeout(handleModelsChange);
                                        }}/>
                                    </div>
                                ))}
                                <Button size="small" className="w-fit" icon={<PlusIcon size={16}/>} onClick={() => add('')}>{t('settings.ai.add_model')}</Button>
                            </div>
                        )}
                    </Form.List>
                </Form.Item>

                <Typography.Title level={5}>{t('settings.ai.advanced_profile')}</Typography.Title>
                {apiType !== 'anthropic' ? (
                    <Form.Item
                        name="customRequestBodyText"
                        label={t('settings.ai.custom_request_body')}
                        extra={t('settings.ai.custom_request_body_tip')}
                        rules={[{
                            validator: async (_, value) => {
                                try {
                                    const parsed = JSON.parse(value || '{}');
                                    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
                                } catch {
                                    throw new Error(t('settings.ai.custom_request_body_invalid'));
                                }
                            },
                        }]}
                    >
                        <Input.TextArea rows={6} className="font-mono" spellCheck={false} placeholder={'{\n  "reasoning_effort": "high"\n}'}/>
                    </Form.Item>
                ) : null}
                <div className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                    <Form.Item name="contextWindow" label={t('settings.ai.context_window')} extra={t('settings.ai.context_window_tip')}>
                        <InputNumber min={1} max={AI_CONTEXT_WINDOW_MAX} step={1024} precision={0} className="w-full"/>
                    </Form.Item>
                    {apiType === 'anthropic' ? (
                        <Form.Item name="maxOutputTokens" label={t('settings.ai.max_output_tokens')} extra={t('settings.ai.max_output_tokens_tip')}>
                            <InputNumber min={1} max={AI_MAX_OUTPUT_TOKENS} step={1024} precision={0} className="w-full"/>
                        </Form.Item>
                    ) : null}
                    <Form.Item name="maxRetries" label={t('settings.ai.max_retries')} extra={t('settings.ai.max_retries_tip')}>
                        <InputNumber min={0} max={10} precision={0} className="w-full"/>
                    </Form.Item>
                    <Form.Item name="userAgent" label="User-Agent" extra={t('settings.ai.user_agent_tip')}>
                        <Input placeholder="Mozilla/5.0 ..."/>
                    </Form.Item>
                    <Form.Item name="httpProxy" label={t('settings.ai.http_proxy')} extra={t('settings.ai.http_proxy_tip')}>
                        <Input placeholder="http://127.0.0.1:7890"/>
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
};

export default AIProfileModal;

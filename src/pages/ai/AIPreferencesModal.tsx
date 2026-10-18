import {App, Button, Empty, Form, Modal, Radio, Spin, Switch, Typography} from 'antd';
import {useTranslation} from 'react-i18next';
import {AI_DISPLAY_LEVELS, useAIPreferences, type AIPreferences} from '@/api/ai-preferences-api';

interface Props {
    open: boolean;
    onClose: () => void;
}

const AIPreferencesModal = ({open, onClose}: Props) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const {query, mutation} = useAIPreferences(open);
    const save = (values: AIPreferences) => {
        mutation.mutate(values, {
            onSuccess: () => {
                message.success(t('general.success'));
                onClose();
            },
        });
    };
    return (
        <Modal
            title={t('ai_assistant.personal_preferences')}
            open={open}
            onCancel={onClose}
            footer={null}
            width={560}
            destroyOnHidden
            mask={{closable: !mutation.isPending}}
            closable={!mutation.isPending}
            keyboard={!mutation.isPending}
        >
            {query.isPending ? <div className="flex justify-center py-8"><Spin/></div> : query.isError ? (
                <Empty description={t('ai_assistant.preferences_load_failed')}>
                    <Button onClick={() => void query.refetch()}>{t('actions.retry')}</Button>
                </Empty>
            ) : (
                <Form<AIPreferences> layout="vertical" preserve={false} initialValues={query.data} onFinish={save} disabled={mutation.isPending}>
                    <Typography.Paragraph type="secondary">{t('ai_assistant.personal_preferences_tip')}</Typography.Paragraph>
                    <Form.Item name="displayLevel" label={t('settings.ai.display_title')}>
                        <Radio.Group className="w-full">
                            <div className="grid grid-cols-1 gap-3">
                                {AI_DISPLAY_LEVELS.map(level => (
                                    <Radio key={level} value={level} className="!m-0 !flex w-full !items-start rounded-lg border border-gray-200/70 !px-4 !py-3 dark:border-white/10">
                                        <div className="min-w-0 pl-1">
                                            <div className="font-medium">{t(`settings.ai.display_levels.${level}`)}</div>
                                            <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t(`settings.ai.display_hints.${level}`)}</div>
                                        </div>
                                    </Radio>
                                ))}
                            </div>
                        </Radio.Group>
                    </Form.Item>
                    <div className="rounded-lg border border-gray-200/70 p-3 dark:border-white/10">
                        <div className="flex items-center justify-between gap-4">
                            <Typography.Text strong>{t('settings.ai.include_command_snippets')}</Typography.Text>
                            <Form.Item name="includeCommandSnippets" valuePropName="checked" noStyle>
                                <Switch aria-label={t('settings.ai.include_command_snippets')}/>
                            </Form.Item>
                        </div>
                        <div className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{t('ai_assistant.include_command_snippets_tip')}</div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button disabled={mutation.isPending} onClick={onClose}>{t('actions.cancel')}</Button>
                        <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t('actions.save')}</Button>
                    </div>
                </Form>
            )}
        </Modal>
    );
};

export default AIPreferencesModal;

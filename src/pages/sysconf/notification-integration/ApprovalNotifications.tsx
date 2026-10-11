import {useEffect} from 'react';
import {Alert, App, Button, Card, Form, Select, Space, Spin, Switch, Tag, Typography} from 'antd';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {approvalNotificationApi, notificationRecipientApi, type ApprovalNotificationSettings} from '@/api/notification-api';
import {channelTypeLabel, eventTypeLabel} from './constants';

const ApprovalNotifications = () => {
    const {t} = useTranslation();
    const {message, modal} = App.useApp();
    const queryClient = useQueryClient();
    const [form] = Form.useForm<ApprovalNotificationSettings>();
    const query = useQuery({queryKey: ['approval-notifications'], queryFn: approvalNotificationApi.get});
    const recipients = useQuery({queryKey: ['notification-recipients'], queryFn: notificationRecipientApi.getAll});
    const enabled = Form.useWatch('enabled', form);
    const accessSpecified = Form.useWatch('accessSpecified', {form, preserve: true});
    const workOrderSpecified = Form.useWatch('workOrderSpecified', {form, preserve: true});
    useEffect(() => {
        if (query.data) form.setFieldsValue(query.data.settings);
    }, [form, query.data]);
    const save = useMutation({
        mutationFn: approvalNotificationApi.save,
        onSuccess: async () => {
            message.success(t('general.success'));
            await queryClient.invalidateQueries({queryKey: ['approval-notifications']});
        },
    });
    if (query.isPending) return <div className="mb-4"><Spin/></div>;
    if (!query.data) return <div className="mb-4"><Alert type="error" title={query.error?.message}/></div>;
    const data = query.data;
    const handleSave = async () => {
        await form.validateFields();
        const values = {...data.settings, ...form.getFieldsValue(true)};
        if (!values.accessSpecified) values.accessApproverIds = [];
        if (!values.workOrderSpecified) values.workOrderApproverIds = [];
        if (data.legacyRules.length) {
            modal.confirm({
                title: t('settings.notification.approval_replace_title'),
                content: t('settings.notification.approval_replace_tip'),
                onOk: () => save.mutateAsync({...values, replaceLegacy: true}),
            });
        } else {
            save.mutate(values);
        }
    };
    const scopeOptions = [
        {value: false, label: t('settings.notification.approval_scope_all')},
        {value: true, label: t('settings.notification.approval_scope_selected')},
    ];
    return <div className="mb-4">
        <Card size="small">
            <Form form={form} layout="vertical" disabled={save.isPending}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Space wrap>
                        <Typography.Text strong>{t('settings.notification.approval_title')}</Typography.Text>
                        <Form.Item name="enabled" valuePropName="checked" style={{marginBottom: 0}}>
                            <Switch aria-label={t('settings.notification.approval_title')}/>
                        </Form.Item>
                        <Tag color={data.mailReady ? 'success' : 'default'}>{t(data.mailReady ? 'settings.notification.approval_mail_ready' : 'settings.notification.approval_mail_unavailable')}</Tag>
                        <Tag color={data.wecomReady ? 'success' : 'default'}>{t(data.wecomReady ? 'settings.notification.approval_wecom_ready' : 'settings.notification.approval_wecom_unavailable')}</Tag>
                    </Space>
                    <Button loading={save.isPending} onClick={handleSave}>{t('actions.save')}</Button>
                </div>
                <Typography.Paragraph type="secondary" style={{marginTop: 12, marginBottom: 8}}>
                    {t('settings.notification.approval_auto_tip')}
                </Typography.Paragraph>
                {data.legacyRules.length > 0 && <div className="mb-3">
                    <Alert type="warning" showIcon title={t('settings.notification.approval_legacy_tip')}/>
                </div>}
                <Typography.Paragraph type="secondary">{t('settings.notification.approval_scope_tip')}</Typography.Paragraph>
                <Form.Item name="accessSpecified" getValueProps={value => ({value: String(value ?? false)})} getValueFromEvent={value => value === 'true'} label={t('settings.notification.approval_access_scope')}>
                    <Select options={scopeOptions.map(option => ({...option, value: String(option.value)}))}/>
                </Form.Item>
                {accessSpecified && <Form.Item name="accessApproverIds" label={t('settings.notification.specified_users')} rules={[{required: !!enabled}]}>
                    <Select mode="multiple" loading={recipients.isPending} showSearch={{optionFilterProp: 'label'}}
                        options={(recipients.data || []).filter(user => user.accessApprover).map(user => ({value: user.id, label: user.name}))}/>
                </Form.Item>}
                <Form.Item name="workOrderSpecified" getValueProps={value => ({value: String(value ?? false)})} getValueFromEvent={value => value === 'true'} label={t('settings.notification.approval_work_order_scope')}>
                    <Select options={scopeOptions.map(option => ({...option, value: String(option.value)}))}/>
                </Form.Item>
                {workOrderSpecified && <Form.Item name="workOrderApproverIds" label={t('settings.notification.specified_users')} rules={[{required: !!enabled}]}>
                    <Select mode="multiple" loading={recipients.isPending} showSearch={{optionFilterProp: 'label'}}
                        options={(recipients.data || []).filter(user => user.workOrderApprover).map(user => ({value: user.id, label: user.name}))}/>
                </Form.Item>}
                {data.legacyRules.length > 0 && <div>
                    <Typography.Text strong>{t('settings.notification.approval_legacy_rules')}</Typography.Text>
                    {data.legacyRules.map(rule => <div key={rule.id} className="mt-2">
                        <Typography.Text>{rule.name}</Typography.Text>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {rule.eventTypes.map(kind => <Tag key={kind}>{eventTypeLabel(kind, t)}</Tag>)}
                            {rule.channelIds.map(channel => <Tag key={channel}>{channelTypeLabel(channel, t)}</Tag>)}
                        </div>
                        <Typography.Text type="secondary">{rule.recipientMode === 'specifiedUsers'
                            ? rule.recipientIds.map(id => recipients.data?.find(user => user.id === id)?.name || id).join('、')
                            : t(rule.recipientMode === 'requester' ? 'settings.notification.mode_requester' : 'settings.notification.approval_scope_all')}</Typography.Text>
                    </div>)}
                </div>}
            </Form>
        </Card>
    </div>;
};
export default ApprovalNotifications;

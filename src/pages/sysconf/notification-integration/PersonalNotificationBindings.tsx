import {useState} from 'react';
import {App, Button, Form, Input, Modal, Segmented, Space, Switch, Table, Tag, Typography} from 'antd';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {notificationRecipientApi, type NotificationRecipient} from '@/api/notification-api';

const PersonalNotificationBindings = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<NotificationRecipient>();
    const [form] = Form.useForm<{mode: 'automatic' | 'manual'; address: string; enabled: boolean}>();
    const bindingMode = Form.useWatch('mode', form);
    const recipients = useQuery({queryKey: ['notification-recipients'], queryFn: notificationRecipientApi.getAll});
    const save = useMutation({
        mutationFn: ({userId, address, enabled}: {userId: string; address: string; enabled: boolean}) =>
            notificationRecipientApi.setBinding(userId, {address, enabled}),
        onSuccess: async () => {
            message.success(t('general.success'));
            setSelected(undefined);
            await queryClient.invalidateQueries({queryKey: ['notification-recipients']});
        },
    });
    const test = useMutation({
        mutationFn: (userId: string) => notificationRecipientApi.test('wecomApp', userId),
        onSuccess: () => message.success(t('settings.notification.test_success')),
    });
    return <div className="mt-6">
        <Typography.Title level={5}>{t('settings.notification.personal_bindings')}</Typography.Title>
        <Typography.Paragraph type="secondary">{t('settings.notification.binding_tip')}</Typography.Paragraph>
        {recipients.error && <Typography.Paragraph type="danger">{recipients.error.message}</Typography.Paragraph>}
        <Table<NotificationRecipient>
            size="small"
            rowKey="id"
            loading={recipients.isPending}
            dataSource={recipients.data || []}
            pagination={{pageSize: 10}}
            scroll={{x: 650}}
            columns={[
                {title: t('settings.notification.recipient'), dataIndex: 'name'},
                {title: t('settings.notification.wecom_member'), render: (_, user) => t(user.wecomAddress ? 'settings.notification.member_associated' : 'settings.notification.member_unassociated')},
                {title: t('settings.notification.binding_source'), render: (_, user) =>
                    <Tag>{t(user.wecomSource === 'manual' ? 'settings.notification.binding_manual' : user.wecomSource === 'identity' ? 'settings.notification.binding_identity' : 'settings.notification.binding_unavailable')}</Tag>},
                {title: t('actions.label'), render: (_, user) => <Space>
                    <Button type="link" size="small" onClick={() => {
                        form.setFieldsValue({mode: user.binding ? 'manual' : 'automatic', address: user.binding?.address || '', enabled: user.binding?.enabled ?? true});
                        setSelected(user);
                    }}>{t('actions.edit')}</Button>
                    <Button type="link" size="small" disabled={!user.wecomAddress} loading={test.isPending && test.variables === user.id}
                        onClick={() => test.mutate(user.id)}>{t('settings.notification.test')}</Button>
                </Space>},
            ]}
        />
        <Modal title={t('settings.notification.personal_bindings')} open={!!selected} destroyOnHidden
            confirmLoading={save.isPending} onCancel={() => setSelected(undefined)} onOk={async () => {
                const values = await form.validateFields();
                if (selected) save.mutate({userId: selected.id, address: values.mode === 'automatic' ? '' : values.address.trim(), enabled: values.mode === 'automatic' ? true : values.enabled});
            }}>
            <Form form={form} layout="vertical">
                <Form.Item label={t('settings.notification.recipient')}><Typography.Text>{selected?.name}</Typography.Text></Form.Item>
                <Form.Item name="mode" label={t('settings.notification.binding_mode')}>
                    <Segmented block options={[
                        {value: 'automatic', label: t('settings.notification.binding_automatic')},
                        {value: 'manual', label: t('settings.notification.binding_manual')},
                    ]}/>
                </Form.Item>
                {bindingMode === 'automatic' ? <Typography.Paragraph type="secondary">
                    {t('settings.notification.binding_automatic_tip')}
                </Typography.Paragraph> : <>
                    <Form.Item name="address" label={t('settings.notification.wecom_member_id')} extra={t('settings.notification.binding_manual_tip')}
                        rules={[{required: true}, {validator: (_, value: string) => value?.trim() && value.trim().toLowerCase() !== '@all' && !/[|,;\s\x00-\x1f\x7f]/.test(value.trim()) ? Promise.resolve() : Promise.reject(new Error(t('settings.notification.single_member_required')))}]}>
                        <Input autoComplete="off"/>
                    </Form.Item>
                    <Form.Item name="enabled" label={t('general.status')} valuePropName="checked"><Switch/></Form.Item>
                </>}

            </Form>
        </Modal>
    </div>;
};
export default PersonalNotificationBindings;

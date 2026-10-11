import {App, Button, Checkbox, Form, Spin, Switch, Typography} from 'antd';
import {useTranslation} from 'react-i18next';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSearchParams} from 'react-router-dom';
import accountApi, {NotificationPreferences as Preferences} from '@/api/account-api';
import {useFormRequest} from '@/hook/use-antd-form-query';

const NotificationPreferences = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm<Preferences>();
    const queryClient = useQueryClient();
    const [,setParams] = useSearchParams();
    const query = useFormRequest(form,['notification-preferences'],async () => {
        const data = await accountApi.getNotificationPreferences();
        return {...data, ...data.preferences};
    });
    const emailEnabled = Form.useWatch('emailEnabled',form);
    const wecomEnabled = Form.useWatch('wecomEnabled',form);
    const enabled = emailEnabled || wecomEnabled;
    const save = useMutation({mutationFn: accountApi.setNotificationPreferences,onSuccess: async () => {
        message.success(t('general.success'));
        await queryClient.invalidateQueries({queryKey:['notification-preferences']});
    }});
    if (query.isPending) return <Spin/>;
    if (!query.data) return <Typography.Text type="danger">{query.error?.message}</Typography.Text>;
    const data=query.data;
    return <div className="max-w-xl">
        <div className="mb-5">
            <Typography.Text>{t('account.notifications.mail')}: {data.mail || t('account.notifications.no_mail')}</Typography.Text>
            <Button type="link" size="small" onClick={() => setParams({activeKey:'change-info'})}>{t('account.notifications.change_mail')}</Button>
            {!data.mailEnabled && <div className="mt-2"><Typography.Text type="warning">{t('account.notifications.service_unavailable')}</Typography.Text></div>}
            {!data.mail && <div className="mt-2"><Typography.Text type="secondary">{t('account.notifications.bind_first')}</Typography.Text></div>}
        </div>
        <Form form={form} layout="vertical" disabled={save.isPending}
            onFinish={values => save.mutate({wecomEnabled:values.wecomEnabled ?? false,emailEnabled:values.emailEnabled,accessRequestResults:values.accessRequestResults,workOrderResults:values.workOrderResults,pendingApprovals:values.pendingApprovals ?? data.preferences.pendingApprovals})}>
            <Form.Item name="emailEnabled" label={t('account.notifications.email_enabled')} valuePropName="checked"><Switch/></Form.Item>
            <Form.Item name="wecomEnabled" label={t('account.notifications.wecom_enabled')} valuePropName="checked"
                extra={!data.wecomChannelEnabled ? t('account.notifications.wecom_unavailable') : !data.wecomBound ? t('account.notifications.wecom_unbound') : t('account.notifications.wecom_bound')}>
                <Switch/>
            </Form.Item>
            <Form.Item name="accessRequestResults" valuePropName="checked"><Checkbox disabled={!enabled || save.isPending}>{t('account.notifications.access_results')}</Checkbox></Form.Item>
            <Form.Item name="workOrderResults" valuePropName="checked"><Checkbox disabled={!enabled || save.isPending}>{t('account.notifications.work_order_results')}</Checkbox></Form.Item>
            {data.canReceivePendingApproval && <Form.Item name="pendingApprovals" valuePropName="checked"><Checkbox disabled={!enabled || save.isPending}>{t('account.notifications.pending_approvals')}</Checkbox></Form.Item>}
            <p className="mb-4 text-gray-500">{t('account.notifications.security_unaffected')}</p>
            <Button type="primary" htmlType="submit" loading={save.isPending}>{t('actions.save')}</Button>
        </Form>
    </div>;
};
export default NotificationPreferences;

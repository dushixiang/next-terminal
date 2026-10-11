import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Alert, App, Button, Descriptions, Form, Input, Select, Space, Spin, Tag, Typography} from 'antd';
import accountApi, {ChangeAccountInfo, DeliveryChannel} from '@/api/account-api';
import times from '@/components/time/times';
import ContactVerificationModal from './ContactVerificationModal';

const normalizeNotificationLanguage = (language: string) => {
    const value = language.toLowerCase().replace('_', '-');
    if (value === 'en' || value === 'en-us') return 'en-US';
    if (value === 'ja' || value === 'ja-jp') return 'ja-JP';
    if (value === 'zh-tw' || value === 'zh-hk') return 'zh-TW';
    return 'zh-CN';
};

const ChangeInfo = () => {
    const {t, i18n} = useTranslation();
    const languages = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP'];
    const languageLabel = (value: string) => {
        const language = normalizeNotificationLanguage(value);
        return t(language === 'en-US' ? 'general.language_en_us' : language === 'zh-TW' ? 'general.language_zh_tw' : language === 'ja-JP' ? 'general.language_ja_jp' : 'general.language_zh_cn');
    };
    const {message} = App.useApp();
    const [form] = Form.useForm<ChangeAccountInfo>();
    const [contactChannel, setContactChannel] = useState<DeliveryChannel>();
    const [editing, setEditing] = useState(false);
    const queryClient = useQueryClient();
    const infoQuery = useQuery({queryKey: ['info'], queryFn: accountApi.getUserInfo});
    const info = infoQuery.data;
    const mutation = useMutation({
        mutationFn: accountApi.changeInfo,
        onSuccess: async () => {
            setEditing(false);
            message.success(t('general.success'));
            await Promise.all([
                queryClient.invalidateQueries({queryKey: ['info']}),
                queryClient.invalidateQueries({queryKey: ['infoQuery']}),
            ]);
        },
    });
    const beginEdit = () => {
        if (!info) return;
        form.resetFields();
        form.setFieldsValue({nickname: info.nickname, language: normalizeNotificationLanguage(info.language || i18n.resolvedLanguage || 'zh-CN')});
        setEditing(true);
    };
    const status = (value?: string | boolean) => {
        if (value === undefined || value === '') return '-';
        const enabled = value === true || value === 'enabled';
        return <Tag color={enabled ? 'success' : 'default'}>{t(enabled ? 'general.enabled' : 'general.disabled')}</Tag>;
    };
    const columns = {xs: 1, sm: 1, md: 2};
    const missing = t('account.profile_details.not_filled');
    if (infoQuery.isPending) return <Spin/>;
    if (infoQuery.isError || !info) return <Alert type="error" title={t('account.profile_details.load_failed')}
        action={<Button onClick={() => void infoQuery.refetch()}>{t('actions.retry')}</Button>}/>;

    return <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Typography.Title level={5} style={{margin: 0}}>{t('account.profile_details.basic')}</Typography.Title>
            {!editing && <Button type="primary" onClick={beginEdit} disabled={mutation.isPending}>{t('account.profile_details.edit')}</Button>}
        </div>
        {editing ? <Form form={form} onFinish={values => mutation.mutate({nickname: values.nickname.trim(), language: values.language})}
            layout="vertical" className="max-w-xl" disabled={mutation.isPending}>
            <Form.Item label={t('gateways.username')}><Input value={info.username} disabled/></Form.Item>
            <Form.Item name="nickname" label={t('identity.user.nickname')} rules={[{required: true, whitespace: true}]}>
                <Input/>
            </Form.Item>
            <Form.Item name="language" label={t('account.profile_details.notification_language')}>
                <Select options={languages.map(value => ({value, label: languageLabel(value)}))}/>
            </Form.Item>
            <Form.Item><Space>
                <Button type="primary" htmlType="submit" loading={mutation.isPending}>{t('actions.save')}</Button>
                <Button onClick={() => {form.resetFields(); setEditing(false);}}>{t('actions.cancel')}</Button>
            </Space></Form.Item>
        </Form> : <Descriptions column={columns} items={[
            {key: 'username', label: t('gateways.username'), children: info.username},
            {key: 'nickname', label: t('identity.user.nickname'), children: info.nickname || missing},
            {key: 'mail', label: t('identity.user.mail'), children: <Space wrap><span>{info.mail || missing}</span><Button type="link" size="small" onClick={() => setContactChannel('email')}>{t('actions.edit')}</Button></Space>},
            {key: 'language', label: t('account.profile_details.notification_language'), children: languageLabel(info.language)},
            {key: 'phone', label: t('identity.user.phone'), children: <Space wrap><span>{info.phone || missing}</span><Button type="link" size="small" onClick={() => setContactChannel('sms')}>{t('actions.edit')}</Button></Space>},
        ]}/>}
        <div className="mt-6">
            <Descriptions title={t('account.profile_details.organization')} column={columns} items={[
                {key: 'departments', label: t('menus.identity.submenus.department'), span: 'filled', children:
                    info.departments?.length ? <Space wrap>{info.departments.map(department =>
                        <Tag key={department.id}>{department.path || department.name}</Tag>)}</Space> : t('account.profile_details.unassigned')},
                {key: 'type', label: t('identity.user.type'), children: t(info.type === 'super-admin' ? 'identity.user.types.super_admin' : info.type === 'admin' ? 'identity.user.types.admin' : 'identity.user.types.normal')},
                {key: 'status', label: t('identity.user.status'), children: status(info.status)},
                {key: 'roles', label: t('account.profile_details.roles'), span: 'filled', children:
                    info.roleDetails?.length ? <Space wrap>{info.roleDetails.map(role => <Tag key={role.id}>{role.name}</Tag>)}</Space> : t('account.profile_details.unassigned')},
            ]}/>
            <Typography.Text type="secondary">{t('account.profile_details.organization_managed')}</Typography.Text>
        </div>
        <div className="mt-6">
            <Descriptions title={t('account.profile_details.session_policy')} column={columns} items={[
                {key: 'recording', label: t('identity.user.recording'), children: status(info.recording)},
                {key: 'watermark', label: t('identity.user.watermark'), children: status(info.watermark)},
            ]}/>
            <Typography.Text type="secondary">{t('account.profile_details.policy_managed')}</Typography.Text>
        </div>
        <div className="mt-6">
            <Descriptions title={t('account.profile_details.security')} column={columns} items={[
                {key: 'mfa', label: t('account.profile_details.mfa'), children: status(info.mfaEnabled)},
                {key: 'force-mfa', label: t('account.profile_details.force_mfa'), children: status(info.forceTotpEnabled)},
                {key: 'created', label: t('general.created_at'), children: info.createdAt ? times.format(info.createdAt) : '-'},
                {key: 'last-login', label: t('account.profile_details.last_login'), children: info.lastLoginAt ? times.format(info.lastLoginAt) : t('account.profile_details.never_logged_in')},
            ]}/>
        </div>
        {contactChannel && <ContactVerificationModal channel={contactChannel} info={info} onClose={() => setContactChannel(undefined)}/>}
    </div>;
};
export default ChangeInfo;

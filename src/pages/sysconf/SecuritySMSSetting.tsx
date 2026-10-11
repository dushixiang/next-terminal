import {Button, Form, InputNumber, Spin, Switch, Typography} from 'antd';
import {useMutation} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import {useFormRequest} from '@/hook/use-antd-form-query';
import {SettingProps} from './SettingPage';

const fields = [
    {name: 'phone-interval', min: 60, max: 3600, value: 60},
    {name: 'phone-hourly', min: 1, max: 1000, value: 10},
    {name: 'ip-interval', min: 1, max: 3600, value: 5},
    {name: 'ip-hourly', min: 1, max: 10000, value: 30},
    {name: 'global-hourly', min: 1, max: 100000, value: 100},
    {name: 'global-daily', min: 1, max: 1000000, value: 500},
];

const fieldName = (scope: string, name: string) => scope === 'email-mfa' ? name.replace('phone-', 'email-') : name;

const transforms = Object.fromEntries(['login', 'mfa', 'email-mfa'].map(scope => [scope, (data: Record<string, any>) => {
    const prefix = scope === 'email-mfa' ? 'email-mfa-' : `sms-${scope}-`;
    return {
        [prefix + 'enabled']: data[prefix + 'enabled'] ?? scope !== 'login',
        ...Object.fromEntries(fields.map(field => [prefix + fieldName(scope, field.name), Number(data[prefix + fieldName(scope, field.name)] ?? field.value)])),
    };
}]));

const SecuritySMSSetting = ({get, set, scope}: SettingProps & {scope: 'login' | 'mfa' | 'email-mfa'}) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const prefix = scope === 'email-mfa' ? 'email-mfa-' : `sms-${scope}-`;
    const enabled = Form.useWatch(prefix + 'enabled', form);
    const query = useFormRequest(form, ['form-request', 'sms-policy', scope], get, {
        transform: transforms[scope],
    });
    const save = useMutation({
        mutationFn: (values: Record<string, unknown>) => set(values),
        onSuccess: async result => { if (result !== false) await query.refetch(); },
    });
    if (query.isPending) return <Spin/>;
    const isEmail = scope === 'email-mfa';
    const serviceEnabled = query.data?.[isEmail ? 'mail-enabled' : 'sms-enabled'];
    const labels = isEmail ? 'settings.email_mfa_policy' : 'settings.sms_policy';
    return <Form form={form} layout="vertical" onFinish={values => save.mutate(values)} disabled={save.isPending}>
        <Form.Item name={prefix + 'enabled'} label={t(isEmail ? 'settings.email_mfa_policy.enabled' : `settings.sms_policy.${scope}_enabled`)} valuePropName="checked">
            <Switch disabled={!serviceEnabled && !enabled}/>
        </Form.Item>
        <div className="mb-6">
            <Typography.Text type="secondary">{t(`${labels}.service_tip`)} </Typography.Text>
            <Link to={`?activeKey=verification-services&serviceActiveKey=${isEmail ? "mail" : "sms"}`}>{t(isEmail ? "settings.mail.setting" : "settings.sms.title")}</Link>
        </div>
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
            {['phone', 'ip', 'global'].map(group => <div key={group}>
                <h3 className="mb-4 font-medium">{t(`${labels}.${group}`)}</h3>
                {fields.filter(field => field.name.startsWith(group + '-')).map(field => <Form.Item
                    key={field.name} name={prefix + fieldName(scope, field.name)} label={t(`${labels}.${field.name}`)}
                    rules={[{required: true}, {type: 'integer', min: field.min, max: field.max}]}>
                    <InputNumber min={field.min} max={field.max} precision={0} style={{width: '100%'}}/>
                </Form.Item>)}
            </div>)}
        </div>
        <div className="mb-6"><Typography.Text type="secondary">{t(`${labels}.quota_tip`)}</Typography.Text></div>
        <Form.Item><Button type="primary" htmlType="submit" loading={save.isPending}>{t('actions.save')}</Button></Form.Item>
    </Form>;
};
export default SecuritySMSSetting;

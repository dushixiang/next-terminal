import {Button, Form, Select, Space, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import {useFormRequest} from "@/hook/use-antd-form-query";

const LogSetting = ({
                        get,
                        set
                    }: SettingProps) => {
    const [form] = Form.useForm();
    let {t} = useTranslation();
    const renderDaysSelect = (name: string, label: string, options: {
        value: string;
        label: string;
    }[]) => <Form.Item label={label} extra={name === 'session-saved-limit-days'
        ? t('settings.log.session.retention_tip')
        : name === 'login-log-saved-limit-days' ? t('settings.log.login_log.retention_tip') : undefined}>
        <Space.Compact>
            <Form.Item name={name} noStyle>
                <Select options={options} style={{width: 100}}/>
            </Form.Item>
            <Button disabled>{t('general.days')}</Button>
        </Space.Compact>
    </Form.Item>;

    useFormRequest(form, ['settings', 'log'], get);
    return <div>
        <Form form={form} layout="vertical" onFinish={set}>
            <Typography.Paragraph type="secondary">{t('settings.log.retention_tip')}</Typography.Paragraph>
            {renderDaysSelect('session-saved-limit-days', t('settings.log.session.saved_limit_days'), [{
                value: '',
                label: '∞'
            }, {
                value: '1',
                label: '1'
            }, {
                value: '7',
                label: '7'
            }, {
                value: '15',
                label: '15'
            }, {
                value: '30',
                label: '30'
            }, {
                value: '60',
                label: '60'
            }, {
                value: '180',
                label: '180'
            }])}
            {renderDaysSelect('login-log-saved-limit-days', t('settings.log.login_log.saved_limit_days'), [{
                value: '',
                label: '∞'
            }, {
                value: '30',
                label: '30'
            }, {
                value: '60',
                label: '60'
            }, {
                value: '180',
                label: '180'
            }, {
                value: '360',
                label: '360'
            }])}
            {renderDaysSelect('cron-log-saved-limit-days', t('settings.log.cron_log.saved_limit_days'), [{
                value: '',
                label: '∞'
            }, {
                value: '30',
                label: '30'
            }, {
                value: '60',
                label: '60'
            }, {
                value: '180',
                label: '180'
            }, {
                value: '360',
                label: '360'
            }])}
            {renderDaysSelect('access-log-saved-limit-days', t('settings.log.access_log.saved_limit_days'), [{
                value: '',
                label: '∞'
            }, {
                value: '7',
                label: '7'
            }, {
                value: '15',
                label: '15'
            }, {
                value: '30',
                label: '30'
            }, {
                value: '60',
                label: '60'
            }, {
                value: '180',
                label: '180'
            }])}
            {renderDaysSelect('db-sql-log-saved-limit-days', t('settings.log.database_sql_log.saved_limit_days'), [{
                value: '',
                label: '∞'
            }, {
                value: '7',
                label: '7'
            }, {
                value: '15',
                label: '15'
            }, {
                value: '30',
                label: '30'
            }, {
                value: '60',
                label: '60'
            }, {
                value: '180',
                label: '180'
            }])}
            <Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit">{t('actions.save')}</Button>
                </Space>
            </Form.Item>
        </Form>
    </div>;
};
export default LogSetting;

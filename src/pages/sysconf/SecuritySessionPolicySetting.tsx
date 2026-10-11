import {Button, Form, InputNumber, Space, Switch, Typography} from "antd";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Save} from "lucide-react";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {SettingProps} from "./SettingPage";

const SecuritySessionPolicySetting = ({
                                          get,
                                          set
                                      }: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [customSessionCount, setCustomSessionCount] = useState<boolean>();

    const wrapGet = async () => {
        const values = await get();
        setCustomSessionCount(values['login-session-count-custom']);
        return values;
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/SecuritySessionPolicySetting.tsx"], wrapGet, true);

    return <Form form={form} onFinish={set} layout="vertical" className="max-w-3xl">
        <section className="border-b border-gray-200 pb-1 dark:border-[#303030]">
            <Typography.Title level={5} style={{marginTop: 0, marginBottom: 16}}>
                {t('settings.security.session.login_session')}
            </Typography.Title>
            <div className="grid gap-x-8 md:grid-cols-2">
                <Form.Item label={t('settings.security.session.duration')}>
                    <Space.Compact block>
                        <Form.Item name="login-session-duration" noStyle>
                            <InputNumber precision={0} min={1} max={365 * 24 * 60}/>
                        </Form.Item>
                        <Space.Addon>{t('general.minute')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
                <Form.Item
                    name="login-session-browser-close-logout"
                    label={t('settings.security.session.browser_close_logout')}
                    extra={t('settings.security.session.browser_close_tip')}
                    valuePropName="checked"
                >
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
            </div>
        </section>

        <section className="border-b border-gray-200 py-5 dark:border-[#303030]">
            <Typography.Title level={5} style={{marginTop: 0, marginBottom: 16}}>
                {t('settings.security.session.session_count')}
            </Typography.Title>
            <div className="grid gap-x-8 md:grid-cols-2">
                <Form.Item
                    name="login-session-count-custom"
                    label={t("settings.security.session.count_custom")}
                    required
                    valuePropName="checked"
                >
                    <Switch
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                        onChange={setCustomSessionCount}
                    />
                </Form.Item>
                <Form.Item label={t('settings.security.session.count_limit')} extra={t('settings.security.session.count_tip')} required={customSessionCount}>
                    <Space.Compact block>
                        <Form.Item name="login-session-count-limit" noStyle>
                            <InputNumber precision={0} disabled={!customSessionCount} min={1}/>
                        </Form.Item>
                        <Space.Addon>{t('settings.security.devices')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
            </div>
        </section>

        <section className="border-b border-gray-200 py-5 dark:border-[#303030]">
            <Typography.Title level={5} style={{marginTop: 0, marginBottom: 16}}>
                {t('settings.security.session.client_certificate')}
            </Typography.Title>
            <div className="max-w-[360px]">
                <Form.Item label={t('settings.security.client_cert_valid_days')}>
                    <Space.Compact block>
                        <Form.Item name="user-client-cert-valid-days" noStyle>
                            <InputNumber precision={0} min={1}/>
                        </Form.Item>
                        <Space.Addon>{t('general.days')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
            </div>
        </section>

        <div className="pt-5">
            <Form.Item style={{marginBottom: 0}}>
                <Button type="primary" htmlType="submit" icon={<Save size={16}/>}>
                    {t("actions.save")}
                </Button>
            </Form.Item>
        </div>
    </Form>;
};

export default SecuritySessionPolicySetting;

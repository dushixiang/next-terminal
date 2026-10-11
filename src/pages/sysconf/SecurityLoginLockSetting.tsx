import {Alert, Button, Form, InputNumber, Space, Switch} from "antd";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import NLink from "@/components/NLink";
import {useFormRequest} from "@/hook/use-antd-form-query";
import {SettingProps} from "./SettingPage";

const SecurityLoginLockSetting = ({
                                      get,
                                      set
                                  }: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [lockEnabled, setLockEnabled] = useState<boolean>();

    const wrapGet = async () => {
        const values = await get();
        setLockEnabled(values['login-lock-enabled']);
        return values;
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/SecurityLoginLockSetting.tsx"], wrapGet, true);

    return <Form form={form} onFinish={set} layout="vertical">
        <Alert title={<div>
            {t('settings.security.login_lock.tip')}
            <NLink to={'/login-locked'}>
                <span className="ml-2">[{t('menus.identity.submenus.login_locked')}]</span>
            </NLink>
        </div>} type="info" style={{
            marginBottom: 16
        }}/>

        <Form.Item name="login-lock-enabled" label={t("settings.security.login_lock.enabled")} required={true} valuePropName="checked">
            <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                    onChange={setLockEnabled}/>
        </Form.Item>

        <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
            <Form.Item label={t("settings.security.login_lock.failed_duration")}
                       extra={t("settings.security.login_lock.failed_duration_tip")}
                       required={lockEnabled}>
                <Space.Compact block>
                    <Form.Item name="login-lock-failed-duration" noStyle>
                        <InputNumber disabled={!lockEnabled} min={1}/>
                    </Form.Item>
                    <Space.Addon>{t('general.minute')}</Space.Addon>
                </Space.Compact>
            </Form.Item>
            <Form.Item name="login-lock-failed-times" label={t("settings.security.login_lock.failed_times")}
                       required={lockEnabled}>
                <InputNumber disabled={!lockEnabled} min={1} style={{
                    width: "100%"
                }}/>
            </Form.Item>
            <Form.Item label={t('settings.security.login_lock.account_duration')}
                       extra={t('settings.security.login_lock.duration_tip')}
                       required={lockEnabled}>
                <Space.Compact block>
                    <Form.Item name="login-lock-account-duration" noStyle>
                        <InputNumber disabled={!lockEnabled} min={0}/>
                    </Form.Item>
                    <Space.Addon>{t('general.minute')}</Space.Addon>
                </Space.Compact>
            </Form.Item>
            <Form.Item label={t('settings.security.login_lock.ip_duration')}
                       extra={t('settings.security.login_lock.duration_tip')}
                       required={lockEnabled}>
                <Space.Compact block>
                    <Form.Item name="login-lock-ip-duration" noStyle>
                        <InputNumber disabled={!lockEnabled} min={0}/>
                    </Form.Item>
                    <Space.Addon>{t('general.minute')}</Space.Addon>
                </Space.Compact>
            </Form.Item>
        </div>

        <Form.Item>
            <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
        </Form.Item>
    </Form>;
};

export default SecurityLoginLockSetting;

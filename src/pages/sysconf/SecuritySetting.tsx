import React, {useState} from 'react';
import {Alert, Button, Divider, Form, InputNumber, Radio, Space, Switch, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import NLink from "@/components/NLink";
import {useFormRequest} from "@/hook/use-antd-form-query";

const {
    Title
} = Typography;
const SecuritySetting = ({
                             get,
                             set
                         }: SettingProps) => {
    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [lockEnabled, setLockEnabled] = useState<boolean>();
    let [customSessionCount, setCustomSessionCount] = useState<boolean>();
    const wrapGet = async () => {
        let values = await get();
        setLockEnabled(values['login-lock-enabled']);
        setCustomSessionCount(values['login-session-count-custom']);
        values['password-strength'] = JSON.parse(values['password-strength-policy'] || '{}');
        return values;
    };
    const wrapSet = async (values: any) => {
        const ps = values['password-strength'];
        if (ps) {
            delete values['password-strength'];
            values['password-strength-policy'] = JSON.stringify(ps);
        }
        return await set(values);
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/SecuritySetting.tsx"], wrapGet, true);
    return <div>
        <Title level={5} style={{
            marginTop: 0
        }}>{t('settings.security.setting')}</Title>

        <Form form={form} onFinish={wrapSet} layout="vertical">
            <Divider titlePlacement="left">{t('settings.security.protection')}</Divider>
            <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                <Form.Item name="login-captcha-enabled" label={t("settings.security.captcha")} required={true}
                           valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>

                <Form.Item name="login-force-totp-enabled" label={t("settings.security.force_otp")} required={true}
                           valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>

                <Form.Item name="disable-password-login" label={t("settings.security.disable_password_login")}
                           required={true} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
            </div>

            <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                <Form.Item name="access-require-mfa" label={t("settings.security.access_require_mfa")} required={true}
                           valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
                <Form.Item label={t('settings.security.access_mfa_expires_at')}>
                    <Space.Compact block>
                        <Form.Item name="access-mfa-expires-at" noStyle>
                            <InputNumber precision={0} min={0}/>
                        </Form.Item>
                        <Space.Addon>{t('general.minute')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
            </div>

            <Divider titlePlacement="left">{t('settings.security.session_management')}</Divider>
            <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                <Form.Item name="login-session-count-custom" label={t("settings.security.session.count_custom")}
                           required={true} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                            onChange={setCustomSessionCount}/>
                </Form.Item>
                <Form.Item label={t('settings.security.session.count_limit')}
                           required={customSessionCount}>
                    <Space.Compact block>
                        <Form.Item name="login-session-count-limit" noStyle>
                            <InputNumber precision={0} disabled={!customSessionCount} min={1}/>
                        </Form.Item>
                        <Space.Addon>{t('settings.security.devices')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
                <Form.Item label={t('settings.security.session.duration')}>
                    <Space.Compact block>
                        <Form.Item name="login-session-duration" noStyle>
                            <InputNumber precision={0} min={1}/>
                        </Form.Item>
                        <Space.Addon>{t('general.minute')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
                <Form.Item label={t('settings.security.password.expiration_period')}
                           tooltip={t('general.less-zero-tip')} required={true}>
                    <Space.Compact block>
                        <Form.Item name="password-expiration-period" noStyle>
                            <InputNumber precision={0} min={-1}/>
                        </Form.Item>
                        <Space.Addon>{t('general.days')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
                <Form.Item label={t('settings.security.client_cert_valid_days')}>
                    <Space.Compact block>
                        <Form.Item name="user-client-cert-valid-days" noStyle>
                            <InputNumber precision={0} min={1}/>
                        </Form.Item>
                        <Space.Addon>{t('general.days')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
            </div>

            <Divider titlePlacement="left">{t('settings.security.password.complexity')}</Divider>
            <Form.Item label={t('settings.security.password.complexity')} name="password-strength-type">
                <Radio.Group options={[{
                    label: t('settings.security.password.recommend'),
                    value: 'recommend'
                }, {
                    label: t('settings.security.password.customize'),
                    value: 'customize'
                }]}/>
            </Form.Item>
            <Form.Item noStyle={true} shouldUpdate={true}>{form => ((values, form) => {
                if (values['password-strength-type'] !== 'customize') {
                    return null;
                }
                return <div className="rounded-md p-4 bg-gray-50 mt-4 dark:bg-[#141414]">
                    <Form.Item
                        label={t('settings.security.password.too_short')} required>
                        <Space.Compact block>
                            <Form.Item name={["password-strength", "minLength"]} noStyle>
                                <InputNumber min={1}/>
                            </Form.Item>
                            <Space.Addon>{t('settings.security.password.character')}</Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item
                        label={t('settings.security.password.too_simple')} required>
                        <Space.Compact block>
                            <Form.Item name={["password-strength", "minCharacterType"]} noStyle>
                                <InputNumber min={1} max={3}/>
                            </Form.Item>
                            <Space.Addon>{t('assets.type')}</Space.Addon>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotContainUsername"]}
                               label={t("settings.security.password.cannot_contain_username")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotBePalindrome"]}
                               label={t("settings.security.password.cannot_be_palindrome")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                    <Form.Item name={['password-strength', "mustNotWeak"]}
                               label={t("settings.security.password.cannot_be_weak")} valuePropName="checked">
                        <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>
                </div>;
            })(form.getFieldsValue(true), form)}</Form.Item>

            <Divider titlePlacement="left">{t('settings.security.login_lock.setting')}</Divider>
            <Alert title={<div>
                {t('settings.security.login_lock.tip')}
                <NLink to={'/login-locked'}>
                    <span className="ml-2">[{t('menus.identity.submenus.login_locked')}]</span>
                </NLink>
            </div>} type="info" style={{
                marginBottom: 16
            }}/>

            <Form.Item name="login-lock-enabled" label={t("settings.security.login_lock.enabled")} rules={[{
                required: true
            }]} valuePropName="checked">
                <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                        onChange={setLockEnabled}/>
            </Form.Item>

            <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                <Form.Item label={t("settings.security.login_lock.failed_duration")}
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
                           required={lockEnabled}>
                    <Space.Compact block>
                        <Form.Item name="login-lock-account-duration" noStyle>
                            <InputNumber disabled={!lockEnabled} min={0}/>
                        </Form.Item>
                        <Space.Addon>{t('general.minute')}</Space.Addon>
                    </Space.Compact>
                </Form.Item>
                <Form.Item label={t('settings.security.login_lock.ip_duration')}
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
        </Form>
    </div>;
};
export default SecuritySetting;

import React, {useState} from 'react';
import {Alert, Col, Divider, Row, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormDependency, ProFormDigit, ProFormRadio, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import NLink from "@/components/NLink";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";

const {Title} = Typography;

const SecuritySetting = ({get, set}: SettingProps) => {

    const { isMobile } = useMobile();
    let {t} = useTranslation();
    let [lockEnabled, setLockEnabled] = useState<boolean>();

    let [customSessionCount, setCustomSessionCount] = useState<boolean>();

    const wrapGet = async () => {
        let values = await get();
        setLockEnabled(values['login-lock-enabled']);
        setCustomSessionCount(values['login-session-count-custom']);
        values['password-strength'] = JSON.parse(values['password-strength-policy'] || '{}')
        return values;
    }

    const wrapSet = async (values: any) => {
        const ps = values['password-strength'];
        if (ps) {
            delete values['password-strength'];
            values['password-strength-policy'] = JSON.stringify(ps);
        }
        return await set(values);
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.security.setting')}</Title>

            <ProForm
                onFinish={wrapSet}
                request={wrapGet}
                autoFocus={false}
                submitter={{
                    resetButtonProps: {
                        style: {display: 'none'}
                    }
                }}
            >
                <Divider orientation="left">{t('settings.security.protection')}</Divider>
                <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                    <ProFormSwitch
                        name="login-captcha-enabled"
                        label={t("settings.security.captcha")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                    />
                    <ProFormSwitch
                        name="login-force-totp-enabled"
                        label={t("settings.security.force_otp")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                    />

                    <ProFormSwitch
                        name="disable-password-login"
                        label={t("settings.security.disable_password_login")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                    />
                </div>

                <div className={'flex md:items-center md:gap-2 md:flex-row flex-col'}>
                    <ProFormSwitch
                        name="access-require-mfa"
                        label={t("settings.security.access_require_mfa")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                    />
                    <ProFormDigit
                        name="access-mfa-expires-at"
                        label={t('settings.security.access_mfa_expires_at')}
                        min={0}
                        addonAfter={t('settings.security.minute')}
                        fieldProps={{
                            precision: 0 // 只允许整数
                        }}
                    />
                </div>

                <Divider orientation="left">会话管理</Divider>
                <div className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-4'
                )}>
                    <ProFormSwitch
                        name="login-session-count-custom"
                        label={t("settings.security.session.count_custom")}
                        rules={[{required: true}]}
                        checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}
                        fieldProps={{
                            checked: customSessionCount,
                            onChange: setCustomSessionCount,
                        }}
                    />
                    <ProFormDigit
                        name="login-session-count-limit"
                        label={t('settings.security.session.count_limit')}
                        min={1}
                        required={customSessionCount}
                        disabled={!customSessionCount}
                        addonAfter={t('settings.security.devices')}
                        fieldProps={{
                            precision: 0 // 只允许整数
                        }}
                    />
                    <ProFormDigit
                        name="login-session-duration"
                        label={t('settings.security.session.duration')}
                        min={1}
                        addonAfter={t('settings.security.minute')}
                        fieldProps={{
                            precision: 0 // 只允许整数
                        }}
                    />
                    <ProFormDigit
                        name="password-expiration-period"
                        label={t('settings.security.password.expiration_period')}
                        tooltip={t('general.less-zero-tip')}
                        min={-1}
                        required={true}
                        addonAfter={t('general.days')}
                        fieldProps={{
                            precision: 0 // 只允许整数
                        }}
                    />
                </div>

                <Divider orientation="left">{t('settings.security.password.complexity')}</Divider>
                <ProFormRadio.Group
                    label={t('settings.security.password.complexity')}
                    name="password-strength-type"
                    options={[
                        {
                            label: t('settings.security.password.recommend'),
                            value: 'recommend',
                        },
                        {
                            label: t('settings.security.password.customize'),
                            value: 'customize',
                        }
                    ]}
                />
                <ProFormDependency name={['password-strength-type']}>
                    {(values, form) => {
                        if (values['password-strength-type'] !== 'customize') {
                            return null;
                        }
                        return (
                            <div className="rounded-md p-4 bg-gray-50 mt-4 dark:bg-[#141414]">
                                <ProFormDigit
                                    name={["password-strength", "minLength"]}
                                    label={t('settings.security.password.too_short')}
                                    min={1}
                                    required
                                    addonAfter={t('settings.security.password.character')}
                                />
                                <ProFormDigit
                                    name={["password-strength", "minCharacterType"]}
                                    label={t('settings.security.password.too_simple')}
                                    min={1}
                                    max={3}
                                    required
                                    addonAfter={t('settings.security.password.type')}
                                />
                                <ProFormSwitch
                                    name={['password-strength', "mustNotContainUsername"]}
                                    label={t("settings.security.password.cannot_contain_username")}
                                    checkedChildren={t('general.enabled')}
                                    unCheckedChildren={t('general.disabled')}
                                />
                                <ProFormSwitch
                                    name={['password-strength', "mustNotBePalindrome"]}
                                    label={t("settings.security.password.cannot_be_palindrome")}
                                    checkedChildren={t('general.enabled')}
                                    unCheckedChildren={t('general.disabled')}
                                />
                                <ProFormSwitch
                                    name={['password-strength', "mustNotWeak"]}
                                    label={t("settings.security.password.cannot_be_weak")}
                                    checkedChildren={t('general.enabled')}
                                    unCheckedChildren={t('general.disabled')}
                                />
                            </div>
                        );
                    }}
                </ProFormDependency>

                <Divider orientation="left">{t('settings.security.login_lock.setting')}</Divider>
                <Alert
                    message={
                        <div>
                            {t('settings.security.login_lock.tip')}
                            <NLink to={'/login-locked'}>
                                <span className="ml-2">[{t('menus.identity.submenus.login_locked')}]</span>
                            </NLink>
                        </div>
                    }
                    type="info"
                    style={{marginBottom: 16}}
                />

                <ProFormSwitch
                    name="login-lock-enabled"
                    label={t("settings.security.login_lock.enabled")}
                    rules={[{required: true}]}
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    fieldProps={{
                        checked: lockEnabled,
                        onChange: setLockEnabled,
                    }}
                />

                <div className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-4'
                )}>
                    <ProFormDigit
                        name="login-lock-failed-duration"
                        label={t("settings.security.login_lock.failed_duration")}
                        min={1}
                        required={lockEnabled}
                        disabled={!lockEnabled}
                        addonAfter={t('settings.security.minute')}
                    />
                    <ProFormDigit
                        name="login-lock-failed-times"
                        label={t("settings.security.login_lock.failed_times")}
                        min={1}
                        required={lockEnabled}
                        disabled={!lockEnabled}
                    />
                    <ProFormDigit
                        name="login-lock-account-duration"
                        label={t('settings.security.login_lock.account_duration')}
                        min={0}
                        required={lockEnabled}
                        addonAfter={t('settings.security.minute')}
                        disabled={!lockEnabled}
                    />
                    <ProFormDigit
                        name="login-lock-ip-duration"
                        label={t('settings.security.login_lock.ip_duration')}
                        min={0}
                        required={lockEnabled}
                        addonAfter={t('settings.security.minute')}
                        disabled={!lockEnabled}
                    />
                </div>
            </ProForm>
        </div>
    );
};

export default SecuritySetting;
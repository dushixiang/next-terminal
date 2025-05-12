import React, {useState} from 'react';
import {Alert, Divider, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormDependency, ProFormDigit, ProFormRadio, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import NLink from "@/src/components/NLink";
import Disabled from "@/src/components/Disabled";
import {useLicense} from "@/src/hook/use-license";

const {Title} = Typography;

const SecuritySetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    let [lockEnabled, setLockEnabled] = useState<boolean>();

    let [customSessionCount, setCustomSessionCount] = useState<boolean>();
    let [license] = useLicense();

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

            <ProForm onFinish={wrapSet} request={wrapGet} autoFocus={false} submitter={{
                resetButtonProps: {
                    style: {display: 'none'}
                }
            }}>
                <Divider orientation="left">{t('settings.security.protection')}</Divider>
                <Disabled disabled={license.isFree()}>
                    <div className={'flex items-center gap-4'}>
                        <ProFormSwitch name="login-captcha-enabled"
                                       label={t("settings.security.captcha")}
                                       rules={[{required: true}]}
                                       checkedChildren={t('general.enabled')}
                                       unCheckedChildren={t('general.disabled')}
                        />
                        <ProFormSwitch name="login-force-totp-enabled"
                                       label={t("settings.security.force_otp")}
                                       rules={[{required: true}]}
                                       checkedChildren={t('general.enabled')}
                                       unCheckedChildren={t('general.disabled')}
                        />
                        <ProFormSwitch name="access-require-mfa"
                                       label={t("settings.security.access_require_mfa")}
                                       rules={[{required: true}]}
                                       checkedChildren={t('general.enabled')}
                                       unCheckedChildren={t('general.disabled')}
                        />
                    </div>

                    <div className={'flex items-center gap-4'}>
                        <ProFormSwitch name="login-session-count-custom"
                                       label={t("settings.security.session.count_custom")}
                                       rules={[{required: true}]}
                                       checkedChildren={t('general.enabled')}
                                       unCheckedChildren={t('general.disabled')}
                                       fieldProps={{
                                           checked: customSessionCount,
                                           onChange: setCustomSessionCount,
                                       }}
                        />

                        <ProFormDigit name="login-session-count-limit"
                                      label={t('settings.security.session.count_limit')}
                                      min={1}
                                      required={customSessionCount}
                                      disabled={!customSessionCount}
                                      addonAfter={t('settings.security.devices')}
                                      fieldProps={{
                                          precision: 0 // 只允许整数
                                      }}
                        />


                        <ProFormDigit name="login-session-duration"
                                      label={t('settings.security.session.duration')}
                                      min={1}
                                      addonAfter={t('settings.security.minute')}
                                      fieldProps={{
                                          precision: 0 // 只允许整数
                                      }}
                        />

                        <ProFormDigit name="password-expiration-period"
                                      label={t('settings.security.password.expiration_period')}
                                      min={-1}
                                      required={true}
                                      addonAfter={t('general.days')}
                                      tooltip={t('general.less-zero-tip')}
                                      fieldProps={{
                                          precision: 0 // 只允许整数
                                      }}
                        />
                    </div>

                    <ProFormRadio.Group label={t('settings.security.password.complexity')}
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
                                return <></>
                            }
                            return (
                                <div className={'rounded-md p-4 bg-gray-100 dark:bg-gray-900'}
                                >
                                    <ProFormDigit name={["password-strength", "minLength"]}
                                                  label={t('settings.security.password.too_short')}
                                                  min={1}
                                                  required
                                                  addonAfter={t('settings.security.password.character')}
                                    />
                                    <ProFormDigit name={["password-strength", "minCharacterType"]}
                                                  label={t('settings.security.password.too_simple')}
                                                  min={1}
                                                  max={3}
                                                  required
                                                  addonAfter={t('settings.security.password.type')}
                                    />
                                    <ProFormSwitch name={['password-strength', "mustNotContainUsername"]}
                                                   label={t("settings.security.password.cannot_contain_username")}
                                                   checkedChildren={t('general.enabled')}
                                                   unCheckedChildren={t('general.disabled')}
                                    />
                                    <ProFormSwitch name={['password-strength', "mustNotBePalindrome"]}
                                                   label={t("settings.security.password.cannot_be_palindrome")}
                                                   checkedChildren={t('general.enabled')}
                                                   unCheckedChildren={t('general.disabled')}
                                    />
                                    <ProFormSwitch name={['password-strength', "mustNotWeak"]}
                                                   label={t("settings.security.password.cannot_be_weak")}
                                                   checkedChildren={t('general.enabled')}
                                                   unCheckedChildren={t('general.disabled')}
                                    />
                                </div>
                            )
                        }}
                    </ProFormDependency>
                </Disabled>

                <Divider orientation="left">{t('settings.security.login_lock.setting')}</Divider>
                <Disabled disabled={license.isFree()}>
                    <Alert
                        message={
                            <div>{t('settings.security.login_lock.tip')}
                                [<NLink to={'/login-locked'}>{t('menus.identity.submenus.login_locked')}</NLink>]
                            </div>
                        }
                        type="info"
                        style={{marginBottom: 10}}
                    />
                    <ProFormSwitch name="login-lock-enabled"
                                   label={t("settings.security.login_lock.enabled")}
                                   rules={[{required: true}]}
                                   checkedChildren={t('general.enabled')}
                                   unCheckedChildren={t('general.disabled')}
                                   fieldProps={{
                                       checked: lockEnabled,
                                       onChange: setLockEnabled,
                                   }}
                    />
                    <div className={'flex items-baseline gap-2'}>
                        <ProFormDigit name="login-lock-failed-duration"
                                      label={t("settings.security.login_lock.failed_duration")}
                                      min={1}
                                      width={80}
                                      required={lockEnabled}
                                      disabled={!lockEnabled}
                                      addonAfter={t('settings.security.minute')}
                        />

                        <ProFormDigit name="login-lock-failed-times"
                                      label={t("settings.security.login_lock.failed_times")}
                                      min={1}
                                      width={80}
                                      required={lockEnabled}
                                      disabled={!lockEnabled}
                        />
                        <ProFormDigit name="login-lock-account-duration"
                                      label={t('settings.security.login_lock.account_duration')}
                                      min={0}
                                      width={80}
                                      required={lockEnabled}
                                      addonAfter={t('settings.security.minute')}
                                      disabled={!lockEnabled}
                        />
                        <ProFormDigit name="login-lock-ip-duration"
                                      label={t('settings.security.login_lock.ip_duration')}
                                      min={0}
                                      width={80}
                                      required={lockEnabled}
                                      addonAfter={t('settings.security.minute')}
                                      disabled={!lockEnabled}
                        />
                    </div>
                </Disabled>
            </ProForm>
        </div>
    );
};

export default SecuritySetting;
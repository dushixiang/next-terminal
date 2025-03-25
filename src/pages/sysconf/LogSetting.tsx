import React from 'react';
import {Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormSelect, ProFormSwitch} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const LogSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.log.setting')}</Title>
            <ProForm onFinish={set} request={get}>
                <ProFormSwitch name="recording-enabled"
                               label={t('settings.log.recording.enabled')}
                               rules={[{required: true}]}
                               checkedChildren={t('general.enabled')}
                               unCheckedChildren={t('general.disabled')}
                />

                <ProFormSelect name="session-saved-limit-days"
                               label={t('settings.log.session.saved_limit_days')}
                               fieldProps={{
                                   options: [
                                       {value: '', label: '♾️'},
                                       {value: '1', label: '1'},
                                       {value: '7', label: '7'},
                                       {value: '15', label: '15'},
                                       {value: '30', label: '30'},
                                       {value: '60', label: '60'},
                                       {value: '180', label: '180'},
                                   ]
                               }}
                               addonAfter={t('general.days')}
                />
                <ProFormSelect name="login-log-saved-limit-days"
                               label={t('settings.log.login_log.saved_limit_days')}
                               fieldProps={{
                                   options: [
                                       {value: '', label: '♾️'},
                                       {value: '30', label: '30'},
                                       {value: '60', label: '60'},
                                       {value: '180', label: '180'},
                                       {value: '360', label: '360'},
                                   ],
                               }}
                               addonAfter={t('general.days')}
                />
                <ProFormSelect name="cron-log-saved-limit-days"
                               label={t('settings.log.cron_log.saved_limit_days')}
                               fieldProps={{
                                   options: [
                                       {value: '', label: '♾'},
                                       {value: '30', label: '30'},
                                       {value: '60', label: '60'},
                                       {value: '180', label: '180'},
                                       {value: '360', label: '360'},
                                   ]
                               }}
                               addonAfter={t('general.days')}
                />
            </ProForm>
        </div>
    );
};

export default LogSetting;
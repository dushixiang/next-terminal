import React, {useState} from 'react';
import {Alert} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormDigit, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";

const OidcServerSetting = ({get, set}: SettingProps) => {

    const {t} = useTranslation();
    const [enabled, setEnabled] = useState(false);

    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['oidc-server-enabled']);
        return data;
    }

    return (
        <div>
            <Alert
                message={t('settings.oidc_server.description')}
                description={
                    <div>
                        <p>{t('settings.oidc_server.manage_tip_prefix')}<Link to={'/oidc-client'}>{t('settings.oidc_server.manage_link')}</Link>{t('settings.oidc_server.manage_tip_suffix')}</p>
                        <p>{t('settings.oidc_server.endpoints_title')}</p>
                        <ul style={{marginBottom: 0}}>
                            <li>{t('settings.oidc_server.endpoint.discovery')}: <code>/api/.well-known/openid-configuration</code></li>
                            <li>{t('settings.oidc_server.endpoint.jwks')}: <code>/api/oidc/server/.well-known/jwks.json</code></li>
                            <li>{t('settings.oidc_server.endpoint.authorization')}: <code>/api/oidc/server/authorize</code></li>
                            <li>{t('settings.oidc_server.endpoint.token')}: <code>/api/oidc/server/token</code></li>
                            <li>{t('settings.oidc_server.endpoint.userinfo')}: <code>/api/oidc/server/userinfo</code></li>
                        </ul>
                    </div>
                }
                type="info"
                showIcon
                style={{marginBottom: 16}}
            />
            <ProForm
                onFinish={set}
                request={wrapGet}
                autoFocus={false}
                submitter={{
                    resetButtonProps: {
                        style: {display: 'none'}
                    },
                }}
            >
                <ProFormSwitch
                    name="oidc-server-enabled"
                    label={t('settings.oidc_server.enable_label')}
                    rules={[{required: true}]}
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    fieldProps={{
                        checked: enabled,
                        onChange: setEnabled,
                    }}
                />

                <ProFormText
                    name="oidc-server-issuer"
                    label={t('settings.oidc_server.issuer_label')}
                    placeholder="https://next-terminal.example.com/api"
                    tooltip={t('settings.oidc_server.issuer_tooltip')}
                    disabled={!enabled}
                    rules={[
                        {required: enabled, message: t('settings.oidc_server.issuer_required')},
                        {type: 'url', message: t('general.invalid_url')}
                    ]}
                />

                <ProFormDigit
                    name="oidc-server-access-token-ttl"
                    label={t('settings.oidc_server.access_token_ttl_label')}
                    placeholder="3600"
                    tooltip={t('settings.oidc_server.access_token_ttl_tooltip')}
                    min={60}
                    max={86400}
                    disabled={!enabled}
                    rules={[{required: enabled, message: t('settings.oidc_server.ttl_required')}]}
                    fieldProps={{
                        precision: 0,
                    }}
                />

                <ProFormDigit
                    name="oidc-server-refresh-token-ttl"
                    label={t('settings.oidc_server.refresh_token_ttl_label')}
                    placeholder="604800"
                    tooltip={t('settings.oidc_server.refresh_token_ttl_tooltip')}
                    min={3600}
                    max={2592000}
                    disabled={!enabled}
                    rules={[{required: enabled, message: t('settings.oidc_server.ttl_required')}]}
                    fieldProps={{
                        precision: 0,
                    }}
                />

                <ProFormDigit
                    name="oidc-server-id-token-ttl"
                    label={t('settings.oidc_server.id_token_ttl_label')}
                    placeholder="3600"
                    tooltip={t('settings.oidc_server.id_token_ttl_tooltip')}
                    min={60}
                    max={86400}
                    disabled={!enabled}
                    rules={[{required: enabled, message: t('settings.oidc_server.ttl_required')}]}
                    fieldProps={{
                        precision: 0,
                    }}
                />

                <ProFormDigit
                    name="oidc-server-auth-code-ttl"
                    label={t('settings.oidc_server.auth_code_ttl_label')}
                    placeholder="600"
                    tooltip={t('settings.oidc_server.auth_code_ttl_tooltip')}
                    min={60}
                    max={1800}
                    disabled={!enabled}
                    rules={[{required: enabled, message: t('settings.oidc_server.ttl_required')}]}
                    fieldProps={{
                        precision: 0,
                    }}
                />
            </ProForm>
        </div>
    );
};

export default OidcServerSetting;

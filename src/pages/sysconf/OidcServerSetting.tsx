import {useState} from 'react';
import {Button, Form, Input, InputNumber, Switch, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {Trans, useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useFormRequest} from "@/hook/use-antd-form-query";

const {
    Paragraph,
    Text
} = Typography;

const OidcServerSetting = ({
                               get,
                               set
                           }: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [enabled, setEnabled] = useState(false);
    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['oidc-server-enabled']);
        return data;
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/OidcServerSetting.tsx"], wrapGet, true);
    return <div>
        <div className={'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start'}>
            <div>
                <Form form={form} onFinish={set} layout="vertical">
                    <Form.Item name="oidc-server-enabled" label={t('settings.oidc_server.enable_label')}
                               required={true} valuePropName="checked">
                        <Switch checked={enabled} onChange={setEnabled} checkedChildren={t('general.enabled')}
                                unCheckedChildren={t('general.disabled')}/>
                    </Form.Item>

                    <Form.Item name="oidc-server-issuer" label={t('settings.oidc_server.issuer_label')}
                               tooltip={t('settings.oidc_server.issuer_tooltip')} rules={[{
                        required: enabled,
                        message: t('settings.oidc_server.issuer_required')
                    }, {
                        type: 'url',
                        message: t('general.invalid_url')
                    }]}>
                        <Input disabled={!enabled} placeholder="https://example.com/api"/>
                    </Form.Item>

                    <Form.Item name="oidc-server-access-token-ttl"
                               label={t('settings.oidc_server.access_token_ttl_label')}
                               tooltip={t('settings.oidc_server.access_token_ttl_tooltip')} rules={[{
                        required: enabled,
                        message: t('settings.oidc_server.ttl_required')
                    }]}>
                        <InputNumber precision={0} disabled={!enabled} placeholder="3600" min={60} max={86400} style={{
                            width: "100%"
                        }}/>
                    </Form.Item>

                    <Form.Item name="oidc-server-refresh-token-ttl"
                               label={t('settings.oidc_server.refresh_token_ttl_label')}
                               tooltip={t('settings.oidc_server.refresh_token_ttl_tooltip')} rules={[{
                        required: enabled,
                        message: t('settings.oidc_server.ttl_required')
                    }]}>
                        <InputNumber precision={0} disabled={!enabled} placeholder="604800" min={3600} max={2592000}
                                     style={{
                                         width: "100%"
                                     }}/>
                    </Form.Item>

                    <Form.Item name="oidc-server-id-token-ttl" label={t('settings.oidc_server.id_token_ttl_label')}
                               tooltip={t('settings.oidc_server.id_token_ttl_tooltip')} rules={[{
                        required: enabled,
                        message: t('settings.oidc_server.ttl_required')
                    }]}>
                        <InputNumber precision={0} disabled={!enabled} placeholder="3600" min={60} max={86400} style={{
                            width: "100%"
                        }}/>
                    </Form.Item>

                    <Form.Item name="oidc-server-auth-code-ttl" label={t('settings.oidc_server.auth_code_ttl_label')}
                               tooltip={t('settings.oidc_server.auth_code_ttl_tooltip')} rules={[{
                        required: enabled,
                        message: t('settings.oidc_server.ttl_required')
                    }]}>
                        <InputNumber precision={0} disabled={!enabled} placeholder="600" min={60} max={1800} style={{
                            width: "100%"
                        }}/>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                    </Form.Item>
                </Form>
            </div>

            <div className={'space-y-3 border rounded-lg p-4'}>
                <div>
                    <div className={'font-medium'}>{t('settings.oidc_server.description')}</div>
                    <Paragraph style={{
                        marginBottom: 0
                    }}>
                        <Trans i18nKey="settings.oidc_server.manage_tip" components={{link: <Link to="/oidc-client"/>}}/>
                    </Paragraph>
                </div>
                <div>
                    <div className={'font-medium'}>{t('settings.oidc_server.endpoints_title')}</div>
                    <Text type="secondary">{t('settings.oidc_server.endpoint.discovery')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>/api/.well-known/openid-configuration</Paragraph>
                </div>
                <div>
                    <Text type="secondary">{t('settings.oidc_server.endpoint.jwks')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>/api/oidc/server/.well-known/jwks.json</Paragraph>
                </div>
                <div>
                    <Text type="secondary">{t('settings.oidc_server.endpoint.authorization')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>/api/oidc/server/authorize</Paragraph>
                </div>
                <div>
                    <Text type="secondary">{t('settings.oidc_server.endpoint.token')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>/api/oidc/server/token</Paragraph>
                </div>
                <div>
                    <Text type="secondary">{t('settings.oidc_server.endpoint.userinfo')}</Text>
                    <Paragraph style={{
                        marginBottom: 0
                    }} copyable={true}>/api/oidc/server/userinfo</Paragraph>
                </div>
            </div>
        </div>
    </div>;
};
export default OidcServerSetting;

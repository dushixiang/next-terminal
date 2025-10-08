import React, {useState} from 'react';
import {Alert, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormSwitch, ProFormText, ProFormTreeSelect} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import Disabled from "@/src/components/Disabled";
import {useLicense} from "@/src/hook/use-license";
import departmentApi from "@/src/api/department-api";

const {Title} = Typography;

const OidcSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    let [enabled, setEnabled] = useState(false);
    let [license] = useLicense();

    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['oidc-enabled']);
        return data;
    }

    return (
        <div>
            <Disabled disabled={!license.isEnterprise()}>
                <Alert
                    message={t('settings.oidc.tip')}
                    type="info"
                    showIcon
                    style={{marginBottom: 16}}
                />
                <ProForm onFinish={set}
                         request={wrapGet}
                         submitter={{
                             resetButtonProps: {
                                 style: {display: 'none'}
                             }
                         }}>
                    <ProFormSwitch name="oidc-enabled"
                                   label={t("settings.oidc.enabled")}
                                   rules={[{required: true}]}
                                   checkedChildren={t('general.enabled')}
                                   unCheckedChildren={t('general.disabled')}
                                   fieldProps={{
                                       checked: enabled,
                                       onChange: setEnabled,
                                   }}
                    />
                    <ProFormText name="oidc-issuer"
                                 label={t('settings.oidc.issuer')}
                                 placeholder={t('settings.oidc.issuer_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="oidc-client-id"
                                 label={t('settings.oidc.client_id')}
                                 placeholder={t('settings.oidc.client_id_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText.Password name="oidc-client-secret"
                                          label={t('settings.oidc.client_secret')}
                                          placeholder="******"
                                          disabled={!enabled}
                                          rules={[{required: enabled}]}
                    />
                    <ProFormText name="oidc-redirect-uri"
                                 label={t('settings.oidc.redirect_uri')}
                                 placeholder={t('settings.oidc.redirect_uri_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="oidc-scopes"
                                 label={t('settings.oidc.scopes')}
                                 placeholder={t('settings.oidc.scopes_placeholder')}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormTreeSelect
                        name="oidc-department"
                        label={t('settings.oidc.department')}
                        placeholder={t('settings.oidc.department_placeholder')}
                        disabled={!enabled}
                        fieldProps={{
                            showSearch: true,
                            treeDefaultExpandAll: true,
                            treeNodeFilterProp: "title",
                        }}
                        request={async () => {
                            return await departmentApi.getTree();
                        }}
                    />
                </ProForm>
            </Disabled>
        </div>
    );
};

export default OidcSetting;
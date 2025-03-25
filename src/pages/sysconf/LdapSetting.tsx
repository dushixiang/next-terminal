import React, {useState} from 'react';
import {Alert, App, Button, Typography} from "antd";
import {SettingProps} from "./SettingPage";
import {ProForm, ProFormDigit, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import Disabled from "@/src/components/Disabled";
import {useLicense} from "@/src/hook/use-license";
import {useMutation} from "@tanstack/react-query";
import userApi from "@/src/api/user-api";

const {Title} = Typography;

const LdapSetting = ({get, set}: SettingProps) => {

    let {t} = useTranslation();
    let [enabled, setEnabled] = useState(false);

    let [license] = useLicense();
    let {message} = App.useApp();

    let mutation = useMutation({
        mutationFn: userApi.syncLdapUser,
        onSuccess: () => {
            message.success(t('general.success'))
        },
    });

    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['ldap-enabled']);
        return data;
    }

    return (
        <div>
            <Disabled disabled={!license.isEnterprise()}>
                <Title level={5} style={{marginTop: 0}}>{t('settings.ldap.setting')}</Title>
                <Alert
                    message={t('settings.ldap.tip')}
                    type={"info"}
                    style={{marginBottom: 10}}
                />
                <ProForm onFinish={set} request={wrapGet}
                         autoFocus={false}
                         submitter={{
                             render: (props, doms) => [
                                 ...doms,
                                 <Button color={'geekblue'}
                                         variant={'filled'}
                                         key={'sync'}
                                         loading={mutation.isPending}
                                         onClick={() => mutation.mutate()}
                                         disabled={!enabled}
                                 >
                                     {t('actions.sync')}
                                 </Button>
                             ],
                         }}
                >
                    <ProFormSwitch name="ldap-enabled"
                                   label={t('settings.ldap.setting')}
                                   rules={[{required: true}]}
                                   checkedChildren={t('general.enabled')}
                                   unCheckedChildren={t('general.disabled')}
                                   fieldProps={{
                                       checked: enabled,
                                       onChange: setEnabled,
                                   }}
                    />
                    <ProFormText name="ldap-url"
                                 label={t('settings.ldap.url')}
                                 placeholder="ldap://server:389"
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="ldap-user"
                                 label={t('settings.ldap.user')}
                                 tooltip='cn=administrator,dc=domain,dc=com | administrator@domain.com'
                                 placeholder="cn=administrator,dc=domain,dc=com | administrator@domain.com"
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="ldap-password"
                                 label={t('settings.ldap.password')}
                                 placeholder={"******"}
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="ldap-base-dn"
                                 label={t('settings.ldap.base_dn')}
                                 tooltip='dc=domain,dc=com'
                                 placeholder="dc=domain,dc=com"
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormDigit name="ldap-user-search-size-limit"
                                  label={t('settings.ldap.user_search.size_limit')}
                                  tooltip={t('settings.ldap.user_search.size_limit_tooltip')}
                                  placeholder="1000"
                                  min={1}
                                  disabled={!enabled}
                                  rules={[{required: enabled}]}
                    />
                    <ProFormText name="ldap-user-search-filter"
                                 label={t('settings.ldap.user_search.filter')}
                                 tooltip={t('settings.ldap.user_search.filter_tooltip')}
                                 placeholder="(objectClass=*)"
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                    <ProFormText name="ldap-user-property-mapping"
                                 label={t('settings.ldap.user_property_mapping')}
                                 placeholder='{"username": "cn", "nickname": "sn", "mail": "mail"}'
                                 disabled={!enabled}
                                 rules={[{required: enabled}]}
                    />
                </ProForm>
            </Disabled>
        </div>
    );
};

export default LdapSetting;
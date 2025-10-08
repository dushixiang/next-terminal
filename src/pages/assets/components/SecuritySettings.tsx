import React from 'react';
import {ProFormDependency, ProFormSelect, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const SecuritySettings: React.FC = () => {
    const {t} = useTranslation();

    return (
        <>
            <ProFormSelect
                name={["attrs", "security"]}
                label={t('assets.security.mode')}
                fieldProps={{
                    options: [
                        {value: 'any', label: t('assets.security.modes.any')},
                        {value: 'nla', label: t('assets.security.modes.nla')},
                        {value: 'nla-ext', label: t('assets.security.modes.nla_ext')},
                        {value: 'tls', label: t('assets.security.modes.tls')},
                        {value: 'vmconnect', label: t('assets.security.modes.vmconnect')},
                        {value: 'rdp', label: t('assets.security.modes.rdp')},
                    ]
                }}
            />
            <ProFormDependency name={[["attrs", "security"]]}>
                {({attrs}) => {
                    const securityMode = attrs?.security;
                    let description = t('assets.security.mode_extra');
                    
                    switch (securityMode) {
                        case 'any':
                            description = t('assets.security.modes.any_desc');
                            break;
                        case 'nla':
                            description = t('assets.security.modes.nla_desc');
                            break;
                        case 'nla-ext':
                            description = t('assets.security.modes.nla_ext_desc');
                            break;
                        case 'tls':
                            description = t('assets.security.modes.tls_desc');
                            break;
                        case 'vmconnect':
                            description = t('assets.security.modes.vmconnect_desc');
                            break;
                        case 'rdp':
                            description = t('assets.security.modes.rdp_desc');
                            break;
                        default:
                            description = t('assets.security.mode_extra');
                    }
                    
                    return (
                        <div style={{
                            marginTop: '-16px', 
                            marginBottom: '16px', 
                            marginLeft: 'calc(16.666667% + 8px)', // 与label宽度对齐
                            fontSize: '12px', 
                            color: '#666'
                        }}>
                            {description}
                        </div>
                    );
                }}
            </ProFormDependency>
            <ProFormSwitch
                name={["attrs", "ignore-cert"]}
                label={t('assets.security.ignore_cert')}
                extra={t('assets.security.ignore_cert_extra')}
            />
            <ProFormSwitch
                name={["attrs", "cert-tofu"]}
                label={t('assets.security.cert_tofu')}
                extra={t('assets.security.cert_tofu_extra')}
            />
            <ProFormText
                name={["attrs", "cert-fingerprints"]}
                label={t('assets.security.cert_fingerprints')}
                extra={t('assets.security.cert_fingerprints_extra')}
                placeholder={t('assets.security.cert_fingerprints_placeholder')}
            />
            <ProFormSwitch
                name={["attrs", "disable-auth"]}
                label={t('assets.security.disable_auth')}
                extra={t('assets.security.disable_auth_extra')}
            />
        </>
    );
};

export default SecuritySettings;

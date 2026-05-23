import { Form, Input, Select, Switch } from "antd";
import React from 'react';
import { useTranslation } from "react-i18next";
const SecuritySettings: React.FC = () => {
  const {
    t
  } = useTranslation();
  const securityMode = Form.useWatch(["attrs", "security"]);
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
  }
  return <>
            <Form.Item name={["attrs", "security"]} label={t('assets.security.mode')}>
    <Select
        options={[{
          value: 'any',
          label: t('assets.security.modes.any')
        }, {
          value: 'nla',
          label: t('assets.security.modes.nla')
        }, {
          value: 'nla-ext',
          label: t('assets.security.modes.nla_ext')
        }, {
          value: 'tls',
          label: t('assets.security.modes.tls')
        }, {
          value: 'vmconnect',
          label: t('assets.security.modes.vmconnect')
        }, {
          value: 'rdp',
          label: t('assets.security.modes.rdp')
        }]} />
    </Form.Item>
            <div style={{
          marginTop: '-16px',
          marginBottom: '16px',
          marginLeft: 'calc(16.666667% + 8px)',
          // 与label宽度对齐
          fontSize: '12px',
          color: '#666'
        }}>
                            {description}
                        </div>
            <Form.Item name={["attrs", "ignore-cert"]} label={t('assets.security.ignore_cert')} extra={t('assets.security.ignore_cert_extra')} valuePropName="checked">
    <Switch />
    </Form.Item>
            <Form.Item name={["attrs", "cert-tofu"]} label={t('assets.security.cert_tofu')} extra={t('assets.security.cert_tofu_extra')} valuePropName="checked">
    <Switch />
    </Form.Item>
            <Form.Item name={["attrs", "cert-fingerprints"]} label={t('assets.security.cert_fingerprints')} extra={t('assets.security.cert_fingerprints_extra')}>
    <Input placeholder={t('assets.security.cert_fingerprints_placeholder')} />
    </Form.Item>
            <Form.Item name={["attrs", "disable-auth"]} label={t('assets.security.disable_auth')} extra={t('assets.security.disable_auth_extra')} valuePropName="checked">
    <Switch />
    </Form.Item>
        </>;
};
export default SecuritySettings;

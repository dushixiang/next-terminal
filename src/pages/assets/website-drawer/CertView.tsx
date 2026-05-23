import QuerySelect from "@/components/QuerySelect";
import React from 'react';
import { Card, Form, Switch } from "antd";
import { useTranslation } from "react-i18next";
import certificateApi from "@/api/certificate-api";
const CertView: React.FC = () => {
  const {
    t
  } = useTranslation();
  const certificateRequest = async () => {
    const certificates = await certificateApi.getAll();
    return certificates.map(item => ({
      label: item.commonName,
      value: item.id
    }));
  };
  return <div className="flex flex-col gap-4">
            <Card size="small" className="bg-slate-50/60 dark:bg-slate-900/40">
                <Form.Item label={t('general.enabled')} name={['cert', 'enabled']} valuePropName="checked">
    <Switch
          checkedChildren={t('general.yes')}
          unCheckedChildren={t('general.no')} />
      </Form.Item>
            </Card>

            <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
        cert
      }) => {
        if (!cert?.enabled) return null;
        return <Card size="small" className="bg-emerald-50/60 dark:bg-emerald-900/20">
                            <Form.Item label={t('assets.cert')} name={['cert', 'certId']} rules={[{
            required: true
          }]}>
    <QuerySelect placeholder={t('assets.cert')} showSearch request={certificateRequest} />
          </Form.Item>
                        </Card>;
      })(form.getFieldsValue(true), form)}</Form.Item>
        </div>;
};
export default CertView;

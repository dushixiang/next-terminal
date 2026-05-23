import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input, Radio, Switch, InputNumber, Space } from 'antd';
import { useTranslation } from "react-i18next";
import certificateApi from "@/api/certificate-api";
import strings from "@/utils/strings";
const api = certificateApi;
export interface CertificateProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const CertificateModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: CertificateProps) => {
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
  const get = async () => {
    if (id) {
      return await api.getById(id);
    }
    return {
      type: 'self-signed',
      renewBefore: 30,
      requireClientAuth: false
    };
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/assets/CertificateModal.tsx", open, id], get, open);
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>
            <Form ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item name={'commonName'} label={t('assets.domain')} rules={[{
        required: true
      }]}>
    <Input disabled={strings.hasText(id)} />
      </Form.Item>
                <Form.Item label={t('assets.certificates.type')} name='type' rules={[{
        required: true
      }]}>
    <Radio.Group disabled={strings.hasText(id)} options={[{
          label: t('assets.certificates.self_signed'),
          value: 'self-signed'
        }, {
          label: t('assets.certificates.issued'),
          value: 'issued'
        }, {
          label: t('assets.certificates.imported'),
          value: 'imported'
        }]} />
      </Form.Item>
                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          type
        }) => {
          switch (type) {
            case 'self-signed':
              return <>
                                    <div className={'p-4 border rounded-lg space-y-1 mb-4'}>
                                        <div className={'font-medium'}>{t('assets.certificates.self_signed_tip_title')}</div>
                                        <div>{t('assets.certificates.self_signed_root_ca_cert_path')} ./data/root_ca_cert.pem</div>
                                        <div>{t('assets.certificates.self_signed_root_ca_key_path')} ./data/root_ca_key.pem</div>
                                    </div>
                                    <Form.Item name="requireClientAuth" label={'mTLS'} valuePropName="checked">
    <Switch />
                </Form.Item>
                                </>;
            case 'issued':
              return <>
                                    <Form.Item label={t("assets.certificates.renew_before")}>
    <Space.Compact block>
        <Form.Item name='renewBefore' rules={[{
                  required: true
                }]} noStyle>
        <InputNumber
                    min={0}
                    max={3650}
                    step={1} />
        </Form.Item>
        <Space.Addon>{t('general.days')}</Space.Addon>
    </Space.Compact>
                </Form.Item>
                                </>;
            case 'imported':
              return <>
                                    <Form.Item label={t("assets.cert")} name='certificate' rules={[{
                  required: true
                }]}>
    <Input.TextArea
                    rows={4}
                    allowClear={true} />
                </Form.Item>
                                    <Form.Item label={t("assets.private_key")} name='privateKey' rules={[{
                  required: true
                }]}>
    <Input.TextArea
                    rows={4}
                    allowClear={true} />
                </Form.Item>
                                </>;
          }
        })(form.getFieldsValue(true), form)}</Form.Item>
            </Form>
        </Modal>;
};
export default CertificateModal;

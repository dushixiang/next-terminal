import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input, Switch, InputNumber, Space } from 'antd';
import { useTranslation } from "react-i18next";
import storageApi from "@/api/storage-api";
const api = storageApi;
export interface SnippetProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const StorageModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: SnippetProps) => {
  let {
    t
  } = useTranslation();
  const formRef = useRef<FormInstance>(null);
  const get = async () => {
    if (id) {
      let data = await api.getById(id);
      if (data.limitSize > 0) {
        data.limitSize = data.limitSize / 1024 / 1024 / 1024;
      }
      return await data;
    }
    return {};
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/assets/StorageModal.tsx", open, id], get, open);
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      values['limitSize'] = values['limitSize'] * 1024 * 1024 * 1024;
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>
            <Form ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item label={t('general.name')} name="name" rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Form.Item label={t('assets.is_share')} name="isShare" rules={[{
        required: true
      }]} valuePropName="checked">
    <Switch />
      </Form.Item>
                <Form.Item label={t('assets.limit_size')}>
    <Space.Compact block>
        <Form.Item name="limitSize" rules={[{
        required: true
      }]} noStyle>
        <InputNumber
          min={1}
          precision={2} />
        </Form.Item>
        <Space.Addon>GB</Space.Addon>
    </Space.Compact>
      </Form.Item>
            </Form>
        </Modal>;
};
export default StorageModal;

import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input, Radio } from 'antd';
import { useTranslation } from "react-i18next";
import snippetUserApi from "@/api/snippet-user-api";
const api = snippetUserApi;
export interface SnippetProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const SnippetUserModal = ({
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
      return await api.getById(id);
    }
    return {};
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/facade/SnippetUserModal.tsx", open, id], get, open);
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
                <Form.Item label={t('general.name')} name="name" rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Form.Item label={t('assets.content')} name='content' rules={[{
        required: true
      }]}>
    <Input.TextArea />
      </Form.Item>
                <Form.Item name="visibility" label={t('assets.snippet.visibility')} initialValue="private" rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          label: t('assets.snippet.visibility_private'),
          value: 'private'
        }, {
          label: t('assets.snippet.visibility_public'),
          value: 'public'
        }]} />
      </Form.Item>
            </Form>
        </Modal>;
};
export default SnippetUserModal;

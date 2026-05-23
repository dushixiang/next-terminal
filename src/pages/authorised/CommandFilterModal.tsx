import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input } from "antd";
import commandFilterApi from "../../api/command-filter-api.js";
import { useTranslation } from "react-i18next";
const api = commandFilterApi;
export interface CommandFilterProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id?: string;
}
const CommandFilterModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: CommandFilterProps) => {
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
  const get = async () => {
    if (id) {
      return await api.getById(id);
    }
    return {};
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/authorised/CommandFilterModal.tsx", open, id], get, open);
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
                <Form.Item name={'name'} label={t('general.name')} rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
            </Form>
        </Modal>;
};
export default CommandFilterModal;

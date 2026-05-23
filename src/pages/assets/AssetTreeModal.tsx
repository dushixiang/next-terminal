import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useEffect, useRef } from 'react';
import { useTranslation } from "react-i18next";
import { FormInstance, Modal, TreeDataNode, Form, Input } from "antd";
export interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  op: OP;
  node?: TreeDataNode;
}
export type OP = 'add' | 'edit' | undefined;
const AssetTreeModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  op,
  node = {
    title: '',
    key: '',
    children: []
  }
}: Props) => {
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300); // 延迟以确保 Modal 已经完全打开
    }
  }, [open]);
  const get = async () => {
    return node;
  };
  const onOk = () => {
    formRef.current?.validateFields().then(async values => {
      handleOk(values);
    });
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/assets/AssetTreeModal.tsx", open], get, open);
  return <div>
            <Modal title={op === 'edit' ? t('actions.edit') : t('actions.new')} open={open} mask={{
      closable: false
    }} destroyOnHidden={true} onOk={() => {
      onOk();
    }} onCancel={() => {
      handleCancel();
    }} confirmLoading={confirmLoading}>
                <Form ref={formRef} layout="vertical">
                    <Form.Item hidden={true} name={'key'}>
    <Input />
        </Form.Item>
                    <Form.Item name={'title'} label={t('general.name')} rules={[{
          required: true
        }]}>
    <Input
            ref={inputRef}
            onPressEnter={() => {
              onOk();
            }} />
        </Form.Item>
                </Form>
            </Modal>
        </div>;
};
export default AssetTreeModal;

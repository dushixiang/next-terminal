import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useEffect, useRef } from 'react';
import { FormInstance, Modal, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TreeDataNode } from 'antd';
type OP = 'add' | 'edit';
interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  op?: OP;
  node?: TreeDataNode;
}
const WebsiteTreeModal = ({
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
      }, 300);
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
  useFormRequest(formRef, ["form-request", "web/src/pages/assets/WebsiteTreeModal.tsx", open], get, open);
  return <Modal title={op === 'edit' ? t('websites.edit_group') : t('websites.add_group')} open={open} mask={{
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
                <Form.Item name="title" label={t('gateway_group.name')} rules={[{
        required: true,
        message: t('websites.group_name_required')
      }]}>
    <Input
          placeholder={t('gateway_group.name_placeholder')}
          ref={inputRef}
          onPressEnter={() => {
            onOk();
          }} />
      </Form.Item>
            </Form>
        </Modal>;
};
export default WebsiteTreeModal;

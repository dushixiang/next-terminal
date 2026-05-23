import { useFormRequest } from "@/hook/use-antd-form-query";
import { FormInstance, Modal, Form, Input } from 'antd';
import React, { useRef } from 'react';
import { useTranslation } from "react-i18next";
import agentGatewayApi from "@/api/agent-gateway-api";
const api = agentGatewayApi;
interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const AgentGatewayModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: Props) => {
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
  useFormRequest(formRef, ["form-request", "web/src/pages/gateway/AgentGatewayModal.tsx", open, id], get, open);
  return <Modal title={t('actions.edit')} open={open} mask={{
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
export default AgentGatewayModal;

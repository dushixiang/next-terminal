import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input, InputNumber, Radio, Checkbox } from 'antd';
import commandFilterRuleApi, { CommandFilterRule } from "../../api/command-filter-rule-api.js";
import { useTranslation } from "react-i18next";
const api = commandFilterRuleApi;
interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
const CommandFilterRuleModal = ({
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
    return {
      type: 'command',
      priority: 50,
      action: 'reject',
      enabled: true
    } as CommandFilterRule;
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/authorised/CommandFilterRuleModal.tsx", open, id], get, open);
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
                <Form.Item label={t('identity.policy.priority')} name='priority' rules={[{
        required: true
      }]} extra={t('authorised.command_filter.rule.priority_extra')}>
    <InputNumber
          precision={0} // 只允许整数
        min={1} max={100} style={{
          width: "100%"
        }} />
      </Form.Item>
                <Form.Item label={t('authorised.command_filter.rule.type.label')} name='type' rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          value: 'command',
          label: t('authorised.command_filter.rule.type.command')
        }, {
          value: 'regexp',
          label: t('authorised.command_filter.rule.type.regexp')
        }]} />
      </Form.Item>
                <Form.Item label={t('authorised.command_filter.rule.match_content')} name='command' rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Form.Item label={t('identity.policy.action.label')} name='action' rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          value: 'allow',
          label: t('identity.policy.action.allow')
        }, {
          value: 'reject',
          label: t('identity.policy.action.reject')
        }]} />
      </Form.Item>
                <Form.Item name='enabled' rules={[{
        required: true
      }]} valuePropName="checked">
    <Checkbox>{t('general.status')}</Checkbox>
      </Form.Item>
            </Form>
        </Modal>;
};
export default CommandFilterRuleModal;

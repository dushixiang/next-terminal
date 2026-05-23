import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef } from 'react';
import { FormInstance, Modal, Space, Form, Input, Switch } from 'antd';
import { useTranslation } from "react-i18next";
import strategyApi from "@/api/strategy-api";
const api = strategyApi;
export interface StrategyProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id?: string;
}
const StrategyModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: StrategyProps) => {
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
  useFormRequest(formRef, ["form-request", "web/src/pages/authorised/StrategyModal.tsx", open, id], get, open);
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
                <Form.Item name={'name'} label={t('general.name')}>
    <Input />
      </Form.Item>

                <Space direction={'vertical'}>
                    <Space>
                        <Form.Item name={'upload'} label={t('general.upload')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'download'} label={t('authorised.strategy.download')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>

                    <Space>
                        <Form.Item name={'createDir'} label={t('authorised.strategy.create_dir')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'createFile'} label={t('authorised.strategy.create_file')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>

                    <Space>
                        <Form.Item name={'edit'} label={t('actions.edit')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'delete'} label={t('actions.delete')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'rename'} label={t('authorised.strategy.rename')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>


                    <Space>
                        <Form.Item name={'copy'} label={t('actions.copy')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'paste'} label={t('authorised.strategy.paste')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>
                </Space>

            </Form>
        </Modal>;
};
export default StrategyModal;

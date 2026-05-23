import React, { useEffect, useRef, useState } from 'react';
import { FormInstance, Modal, Form, Select, Input } from 'antd';
import { useTranslation } from "react-i18next";
import portalApi, { DatabaseAssetUser } from "@/api/portal-api.ts";
export interface DatabaseWorkOrderModalProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
}
const DatabaseWorkOrderModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading
}: DatabaseWorkOrderModalProps) => {
  const {
    t
  } = useTranslation();
  const formRef = useRef<FormInstance>(null);
  const [assets, setAssets] = useState<DatabaseAssetUser[]>([]);
  useEffect(() => {
    if (!open) {
      formRef.current?.resetFields();
      return;
    }
    portalApi.databaseAssets().then(setAssets).catch(() => setAssets([]));
  }, [open]);
  return <Modal title={t('db.work_order.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={handleCancel} confirmLoading={confirmLoading}>
            <Form ref={formRef} layout="vertical">
                <Form.Item label={t('menus.resource.submenus.database_asset')} name='assetId' rules={[{
        required: true
      }]}>
    <Select
          showSearch={true}
          options={assets.map(item => ({
            label: item.name,
            value: item.id
          }))}
          filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} />
      </Form.Item>
                <Form.Item label={t('db.asset.database')} name='database' rules={[{
        required: true
      }]}>
    <Input placeholder={t('db.work_order.database_placeholder')} />
      </Form.Item>
                <Form.Item label={t('db.sql_log.sql')} name='sql' rules={[{
        required: true
      }]}>
    <Input.TextArea
          rows={6} />
      </Form.Item>
                <Form.Item label={t('db.work_order.reason')} name='requestReason' rules={[{
        required: true
      }]}>
    <Input.TextArea
          rows={3}
          placeholder={t('db.work_order.reason_placeholder')} />
      </Form.Item>
            </Form>
        </Modal>;
};
export default DatabaseWorkOrderModal;

import React, { useRef } from 'react';
import { FormInstance, Modal, Form, Input } from "antd";
import { useTranslation } from "react-i18next";
export interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
}
const UserResetPasswordModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading
}: Props) => {
  const formRef = useRef<FormInstance>(null);
  let {
    t
  } = useTranslation();
  return <Modal title={t('identity.user.reset_password.confirm_title')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>

            <Form ref={formRef} layout="vertical">
                <Form.Item name={'password'} label={t('assets.password')} rules={[{
        pattern: /^\S*$/,
        message: t('identity.user.no_spaces_allowed')
      }]} extra={t('identity.user.reset_password.confirm_content')}>
    <Input />
      </Form.Item>
            </Form>
        </Modal>;
};
export default UserResetPasswordModal;

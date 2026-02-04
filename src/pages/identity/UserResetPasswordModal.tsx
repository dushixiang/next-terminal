import React, {useRef} from 'react';
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {Modal} from "antd";
import {useTranslation} from "react-i18next";
import {WarningTwoTone} from "@ant-design/icons";

export interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
}

const UserResetPasswordModal = ({open, handleOk, handleCancel, confirmLoading}: Props) => {

    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();

    return (
        <Modal
            title={t('identity.user.reset_password.confirm_title')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                        
                    });
            }}
            onCancel={() => {
                
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >

            <ProForm formRef={formRef} submitter={false}>
                <ProFormText name={'password'}
                             label={t('assets.password')}
                             rules={[
                                 {
                                     pattern: /^\S*$/,
                                     message: t('identity.user.no_spaces_allowed'),
                                 }
                             ]}
                             extra={t('identity.user.reset_password.confirm_content')}
                />
            </ProForm>
        </Modal>
    );
};

export default UserResetPasswordModal;
import React, {useRef} from 'react';
import {Modal} from "antd";
import {useTranslation} from "react-i18next";
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {WebauthnCredential} from "@/api/account-api";

export interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    credential: WebauthnCredential
}

const PasskeyModal = ({
                          open,
                          handleOk,
                          handleCancel,
                          confirmLoading,
                          credential,
                      }: Props) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();
    const get = async () => {
        return credential;
    }

    return (
        <Modal
            title={''}
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
            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText name={'name'} label={t('general.name')} rules={[{required: true}]}/>
            </ProForm>
        </Modal>
    );
};

export default PasskeyModal;
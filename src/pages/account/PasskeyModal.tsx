import {useFormRequest} from "@/hook/use-antd-form-query";
import React, {useRef} from 'react';
import {Form, FormInstance, Input, Modal} from "antd";
import {useTranslation} from "react-i18next";
import {WebauthnCredential} from "@/api/account-api";

export interface Props {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    credential?: WebauthnCredential;
}

const PasskeyModal = ({
                          open,
                          handleOk,
                          handleCancel,
                          confirmLoading,
                          credential
                      }: Props) => {
    let {t} = useTranslation();
    const formRef = useRef<FormInstance>(null);
    const get = async () => {
        return credential ?? {};
    };
    useFormRequest(formRef, ["form-request", "web/src/pages/account/PasskeyModal.tsx", open, credential?.id], get, open);
    return <Modal title={''}
                  open={open} mask={{closable: false}}
                  destroyOnHidden={true}
                  onOk={() => {
                      formRef.current?.validateFields().then(async values => {
                          handleOk(values);
                      });
                  }}
                  onCancel={() => {
                      handleCancel();
                  }}
                  confirmLoading={confirmLoading}>

        <Form ref={formRef} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input/>
            </Form.Item>
            <Form.Item name={'name'} label={t('general.name')} required={true}>
                <Input/>
            </Form.Item>
        </Form>
    </Modal>;
};
export default PasskeyModal;

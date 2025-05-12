import React, {useRef} from 'react';
import {Modal} from "antd";
import {useTranslation} from "react-i18next";
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";

interface Props {
    open: boolean
    parameters: string[]
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
}

const GuacdRequiredParameters = ({open, parameters, confirmLoading, handleCancel, handleOk}: Props) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();
    return (
        <Modal
            title={t('access.required_auth')}
            maskClosable={false}
            open={open}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                        
                    });
            }}
            confirmLoading={confirmLoading}
            onCancel={() => {
                
                handleCancel();
            }}
        >
            <ProForm formRef={formRef} submitter={false}>
                {parameters?.map(parameter => {
                    if (parameter == 'password') {
                        return <ProFormText.Password label={t(parameter)} name={parameter}/>
                    } else {
                        return <ProFormText label={t(parameter)} name={parameter}/>
                    }
                })}
            </ProForm>
        </Modal>
    );
};

export default GuacdRequiredParameters;
import React, {useRef} from 'react';
import {Modal} from "antd";
import {ProForm, ProFormInstance, ProFormText, ProFormTextArea} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import snippetUserApi from "@/src/api/snippet-user-api";

const api = snippetUserApi;

export interface SnippetProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const SnippetUserModal = ({
                              open,
                              handleOk,
                              handleCancel,
                              confirmLoading,
                              id,
                          }: SnippetProps) => {
    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {};
    }

    return (

        <Modal
            title={id ? t('actions.edit') : t('actions.new')}
            open={open}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                        formRef.current?.resetFields();
                    });
            }}
            onCancel={() => {
                formRef.current?.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false}>
                <ProFormText hidden={true} name={'id'}/>
                <ProFormText label={t('general.name')} name="name" rules={[{required: true}]}/>
                <ProFormTextArea label={t('assets.content')} name='content' rules={[{required: true}]}/>
            </ProForm>
        </Modal>
    )
};

export default SnippetUserModal;
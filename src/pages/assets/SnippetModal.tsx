import React, {useRef} from 'react';
import {Modal} from "antd";
import snippetApi from "../../api/snippet-api";
import {ProForm, ProFormInstance, ProFormText, ProFormTextArea, ProFormRadio} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const api = snippetApi;

export interface SnippetProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const SnippetModal = ({
                          open,
                          handleOk,
                          handleCancel,
                          confirmLoading,
                          id,
                      }: SnippetProps) => {
    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);

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
                <ProFormText label={t('assets.name')} name="name" rules={[{required: true}]}/>
                <ProFormTextArea label={t('assets.content')} name='content' rules={[{required: true}]}/>
                <ProFormRadio.Group
                    name="visibility"
                    label="可见性"
                    initialValue="private"
                    options={[
                        {label: '私有', value: 'private'},
                        {label: '公开', value: 'public'},
                    ]}
                    rules={[{required: true}]}
                />
            </ProForm>
        </Modal>
    )
};

export default SnippetModal;
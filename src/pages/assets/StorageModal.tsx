import React, {useRef} from 'react';
import {Modal} from "antd";
import {ProForm, ProFormDigit, ProFormInstance, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import storageApi from "@/src/api/storage-api";

const api = storageApi;

export interface SnippetProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const StorageModal = ({
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
            let data = await api.getById(id);
            if (data.limitSize > 0) {
                data.limitSize = data.limitSize / 1024 / 1024 / 1024;
            }
            return await data;
        }
        return {

        };
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
                        values['limitSize'] = values['limitSize'] * 1024 * 1024 * 1024;
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
                <ProFormText label={t('assets.name')} name="name" rules={[{required: true}]}/>
                <ProFormSwitch label={t('assets.is_share')} name="isShare" rules={[{required: true}]}/>
                <ProFormDigit label={t('assets.limit_size')}
                              name="limitSize"
                              rules={[{required: true}]}
                              fieldProps={{
                                  min: 1,
                                  precision: 2,
                              }}
                              addonAfter={'GB'}
                />
            </ProForm>
        </Modal>
    )
};

export default StorageModal;
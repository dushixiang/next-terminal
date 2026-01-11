import React, {useRef} from 'react';
import {Modal} from "antd";
import commandFilterApi from "../../api/command-filter-api.js";
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const api = commandFilterApi;

export interface CommandFilterProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id?: string
}

const CommandFilterModal = ({
                                open,
                                handleOk,
                                handleCancel,
                                confirmLoading,
                                id
                            }: CommandFilterProps) => {

    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();

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
                <ProFormText name={'name'} label={t('authorised.command_filter.name')} rules={[{required: true}]}/>
            </ProForm>
        </Modal>
    )
};

export default CommandFilterModal;

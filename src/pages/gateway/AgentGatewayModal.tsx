import {Modal} from 'antd';
import React, {useRef} from 'react';
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import agentGatewayApi from "@/api/agent-gateway-api";

const api = agentGatewayApi;

interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const AgentGatewayModal = ({
                               open,
                               handleOk,
                               handleCancel,
                               confirmLoading,
                               id,
                           }: Props) => {

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
            title={t('actions.edit')}
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

export default AgentGatewayModal;
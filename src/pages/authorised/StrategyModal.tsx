import React, {useRef} from 'react';
import {Modal, Space} from "antd";
import {ProForm, ProFormInstance, ProFormSwitch, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import strategyApi from "@/src/api/strategy-api";

const api = strategyApi;

export interface StrategyProps {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id?: string
}

const StrategyModal = ({open, handleOk, handleCancel, confirmLoading, id}: StrategyProps) => {

    const formRef = useRef<ProFormInstance>();
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
                <ProFormText name={'name'} label={t('general.name')} />

                <Space direction={'vertical'}>
                    <Space>
                        <ProFormSwitch name={'upload'} label={t('authorised.strategy.upload')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                        <ProFormSwitch name={'download'} label={t('authorised.strategy.download')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Space>

                    <Space>
                        <ProFormSwitch name={'createDir'} label={t('authorised.strategy.create_dir')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                        <ProFormSwitch name={'createFile'} label={t('authorised.strategy.create_file')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Space>

                    <Space>
                        <ProFormSwitch name={'edit'} label={t('authorised.strategy.edit')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                        <ProFormSwitch name={'delete'} label={t('authorised.strategy.remove')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                        <ProFormSwitch name={'rename'} label={t('authorised.strategy.rename')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Space>


                    <Space>
                        <ProFormSwitch name={'copy'} label={t('authorised.strategy.copy')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                        <ProFormSwitch name={'paste'} label={t('authorised.strategy.paste')} checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                    </Space>
                </Space>

            </ProForm>
        </Modal>
    )
};

export default StrategyModal;

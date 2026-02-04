import React, {useRef} from 'react';
import {Modal} from "antd";
import commandFilterRuleApi, {CommandFilterRule} from "../../api/command-filter-rule-api.js";
import {
    ProForm,
    ProFormCheckbox,
    ProFormDigit,
    ProFormInstance,
    ProFormRadio,
    ProFormText
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";

const api = commandFilterRuleApi;

interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

const CommandFilterRuleModal = ({
                                    open,
                                    handleOk,
                                    handleCancel,
                                    confirmLoading,
                                    id
                                }: Props) => {
    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();

    const get = async () => {
        if (id) {
            return await api.getById(id);
        }
        return {
            type: 'command',
            priority: 50,
            action: 'reject',
            enabled: true
        } as CommandFilterRule;
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
                <ProFormDigit label={t('identity.policy.priority')} name='priority' rules={[{required: true}]}
                              extra={t('authorised.command_filter.rule.priority_extra')}
                              min={1} max={100}
                              fieldProps={{
                                  precision: 0 // 只允许整数
                              }}
                />
                <ProFormRadio.Group
                    label={t('authorised.command_filter.rule.type.label')} name='type' rules={[{required: true}]}
                    options={[
                        {value: 'command', label: t('authorised.command_filter.rule.type.command')},
                        {value: 'regexp', label: t('authorised.command_filter.rule.type.regexp')},
                    ]}
                />
                <ProFormText label={t('authorised.command_filter.rule.match_content')} name='command' rules={[{required: true}]}/>
                <ProFormRadio.Group
                    label={t('identity.policy.action.label')} name='action' rules={[{required: true}]}
                    options={[
                        {value: 'allow', label: t('identity.policy.action.allow')},
                        {value: 'reject', label: t('identity.policy.action.reject')},
                    ]}
                />
                <ProFormCheckbox label={t('general.status')} name='enabled' rules={[{required: true}]}>

                </ProFormCheckbox>
            </ProForm>
        </Modal>
    )
};

export default CommandFilterRuleModal;
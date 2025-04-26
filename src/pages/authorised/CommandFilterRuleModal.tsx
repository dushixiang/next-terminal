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
    const formRef = useRef<ProFormInstance>();
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
                <ProFormDigit label={t('authorised.command_filter.rule.priority')} name='priority' rules={[{required: true}]}
                              extra={t('authorised.command_filter.rule.priority_extra')}
                              min={1} max={100}
                              fieldProps={{
                                  precision: 0 // 只允许整数
                              }}
                />
                <ProFormRadio.Group
                    label={t('authorised.command_filter.rule.type.label')} name='type' rules={[{required: true}]}
                    options={[
                        {value: 'command', label: t('authorised.command_filter.rule.type.options.command')},
                        {value: 'regexp', label: t('authorised.command_filter.rule.type.options.regexp')},
                    ]}
                />
                <ProFormText label={t('authorised.command_filter.rule.match_content')} name='command' rules={[{required: true}]}/>
                <ProFormRadio.Group
                    label={t('authorised.command_filter.rule.action.label')} name='action' rules={[{required: true}]}
                    options={[
                        {value: 'allow', label: t('authorised.command_filter.rule.action.options.allow')},
                        {value: 'reject', label: t('authorised.command_filter.rule.action.options.reject')},
                    ]}
                />
                <ProFormCheckbox label={t('authorised.command_filter.rule.status')} name='enabled' rules={[{required: true}]}>

                </ProFormCheckbox>
            </ProForm>
        </Modal>
    )
};

export default CommandFilterRuleModal;
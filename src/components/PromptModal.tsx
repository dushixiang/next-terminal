import {ProForm, ProFormInstance, ProFormText} from '@ant-design/pro-components';
import {Modal} from 'antd';
import React, {useEffect, useRef} from 'react';

interface Props {
    title: string
    value?: string
    open: boolean
    onOk: (prompt: string) => void
    onCancel: () => void
    label: string
    placeholder: string
    confirmLoading: boolean
}

const PromptModal = ({title, open, onOk, onCancel, label, placeholder, confirmLoading, value}: Props) => {

    const formRef = useRef<ProFormInstance>();

    useEffect(() => {
        if (open) {
            formRef.current?.setFieldsValue({
                'prompt': value,
            })
        }
    }, [open, value]);
    return (
        <div>
            <Modal
                title={title}
                open={open}
                onOk={() => {
                    formRef.current?.validateFields()
                        .then(async values => {
                            onOk(values['prompt']);
                            formRef.current?.resetFields();
                        });
                }}
                onCancel={() => {
                    formRef.current?.resetFields();
                    onCancel();
                }}
                confirmLoading={confirmLoading}
            >
                <ProForm formRef={formRef} submitter={false}>
                    <ProFormText name={'prompt'}
                                 label={label}
                                 placeholder={placeholder}
                                 rules={[{required: true}]}
                                 fieldProps={{
                                     autoFocus: true,
                                 }}
                    />
                </ProForm>
            </Modal>
        </div>
    );
};

export default PromptModal;
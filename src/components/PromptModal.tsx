import {Form, FormInstance, Input, Modal} from 'antd';
import React, {useEffect, useRef} from 'react';

interface Props {
    title: string;
    value?: string;
    open: boolean;
    onOk: (prompt: string) => void;
    onCancel: () => void;
    label: string;
    placeholder: string;
    confirmLoading: boolean;
}

const PromptModal = ({
                         title,
                         open,
                         onOk,
                         onCancel,
                         label,
                         placeholder,
                         confirmLoading,
                         value
                     }: Props) => {
    const formRef = useRef<FormInstance>(null);
    useEffect(() => {
        if (open) {
            formRef.current?.setFieldsValue({
                'prompt': value
            });
        }
    }, [open, value]);
    return <div>
        <Modal title={title} open={open} onOk={() => {
            formRef.current?.validateFields().then(async values => {
                onOk(values['prompt']);
            });
        }} onCancel={() => {
            onCancel();
        }} confirmLoading={confirmLoading}>
            <Form ref={formRef} layout="vertical">
                <Form.Item name={'prompt'} label={label} required={true}>
                    <Input
                        placeholder={placeholder}
                        autoFocus={true} />
                </Form.Item>
            </Form>
        </Modal>
    </div>;
};
export default PromptModal;

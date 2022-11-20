import React, {useEffect, useRef} from 'react';
import {Form, Input, Modal} from "antd";

const PromptModal = ({title, open, onOk, onCancel, placeholder}) => {
    const ref = useRef(null);

    const [form] = Form.useForm();

    useEffect(() => {
        if (open) {
            // 解决 modal 异步弹出导致无法获取焦点的问题
            setTimeout(() => {
                ref.current.focus({
                    cursor: 'start',
                });
            }, 100)
        }
        form.resetFields();
    }, [form, open]);


    const handleOk = () => {
        form
            .validateFields()
            .then(values => {
                onOk(values['prompt'])
            })
    }

    return (
        <Modal title={title} open={open} onOk={handleOk} onCancel={onCancel}>
            <Form form={form}>
                <Form.Item name={'prompt'}>
                    <Input ref={ref}
                           onPressEnter={handleOk}
                           placeholder={placeholder}>
                    </Input>
                </Form.Item>
            </Form>

        </Modal>
    );
};

export default PromptModal;
import React, {useEffect, useState} from 'react';
import {Form, Input, Modal} from "antd";
import {useTranslation} from "react-i18next";

interface Props {
    open: boolean
    clipboardText: string
    handleOk: (clipboard: string) => void
    handleCancel: () => void
}

const GuacClipboard = ({open, clipboardText, handleOk, handleCancel}: Props) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => {
        form.setFieldsValue({
            'clipboard': clipboardText
        })
    }, [open]);

    return (
        <div>
            <Modal
                title={t('access.clipboard')}
                maskClosable={false}
                open={open}
                onOk={() => {
                    form.validateFields()
                        .then(values => {
                            setConfirmLoading(true);
                            try {
                                handleOk(values['clipboard']);
                            } finally {
                                setConfirmLoading(false);
                            }
                        })
                        .catch(info => {

                        });
                }}
                confirmLoading={confirmLoading}
                onCancel={handleCancel}
            >
                <Form form={form}>
                    <Form.Item name='clipboard'>
                        <Input.TextArea rows={10}/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GuacClipboard;
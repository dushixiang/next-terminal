import React, {useEffect, useState} from 'react';
import {Form, Input, Modal} from 'antd';
import {useTranslation} from 'react-i18next';

interface Props {
    open: boolean;
    clipboardText: string;
    handleOk: (clipboard: string) => void;
    handleCancel: () => void;
}

const GuacClipboard: React.FC<Props> = ({
                                            open,
                                            clipboardText,
                                            handleOk,
                                            handleCancel,
                                        }) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [confirmLoading, setConfirmLoading] = useState(false);

    // 当对话框打开或 clipboardText 改变时，重置表单并设置初始值
    useEffect(() => {
        if (open) {
            form.resetFields();
            form.setFieldsValue({clipboard: clipboardText});
        }
    }, [open, clipboardText, form]);

    // 点击“确定”时走 onFinish 流程
    const onFinish = (values: { clipboard: string }) => {
        setConfirmLoading(true);
        Promise.resolve()
            .then(() => handleOk(values.clipboard))
            .finally(() => setConfirmLoading(false));
    };

    return (
        <Modal
            title={t('access.clipboard')}
            maskClosable={false}
            open={open}
            onOk={() => form.submit()}
            onCancel={handleCancel}
            confirmLoading={confirmLoading}
            destroyOnHidden={true} // 关闭时销毁，避免多次打开时状态残留
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{clipboard: clipboardText}}
                onFinish={onFinish}
            >
                <Form.Item
                    name="clipboard"
                    rules={[
                        {
                            required: true,
                            message: t('access.guacamole.clipboard_required', 'Please enter clipboard text')
                        },
                    ]}
                >
                    <Input.TextArea rows={10}
                                    placeholder={t('access.guacamole.clipboard_placeholder', 'Paste here...')}/>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default GuacClipboard;

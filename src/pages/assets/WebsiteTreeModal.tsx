import React, { useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { ProForm, ProFormInstance, ProFormText } from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import type { TreeDataNode } from 'antd';

type OP = 'add' | 'edit';

interface Props {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    op?: OP;
    node?: TreeDataNode;
}

const WebsiteTreeModal = ({
                            open,
                            handleOk,
                            handleCancel,
                            confirmLoading,
                            op,
                            node = {
                                title: '',
                                key: '',
                                children: [],
                            },
                        }: Props) => {

    const formRef = useRef<ProFormInstance>(null);
    let {t} = useTranslation();
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [open]);

    const get = async () => {
        return node;
    }

    const onOk = () => {
        formRef.current?.validateFields()
            .then(async values => {
                handleOk(values);
            });
    }

    return (
        <Modal
            title={op === 'edit' ? t('websites.edit_group') : t('websites.add_group')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                onOk()
            }}
            onCancel={() => {
                handleCancel();
            }}
            confirmLoading={confirmLoading}
        >
            <ProForm formRef={formRef} request={get} submitter={false} autoFocus={true}>
                <ProFormText hidden={true} name={'key'}/>
                <ProFormText
                    name="title"
                    label={t('gateway_group.name')}
                    placeholder={t('gateway_group.name_placeholder')}
                    rules={[
                        {
                            required: true,
                            message: t('websites.group_name_required'),
                        },
                    ]}
                    fieldProps={{
                        ref: inputRef,
                        onPressEnter: (e) => {
                            onOk()
                        }
                    }}
                />
            </ProForm>
        </Modal>
    );
};

export default WebsiteTreeModal;
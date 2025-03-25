import React, {useEffect, useRef} from 'react';
import {ProForm, ProFormInstance, ProFormText} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {Modal, TreeDataNode} from "antd";

export interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    op: OP
    node?: TreeDataNode
}

export type OP = 'add' | 'edit' | undefined;

const AssetTreeModal = ({
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

    const formRef = useRef<ProFormInstance>();
    let {t} = useTranslation();
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300); // 延迟以确保 Modal 已经完全打开
        }
    }, [open]);


    const get = async () => {
        return node;
    }

    const onOk = () => {
        formRef.current?.validateFields()
            .then(async values => {
                handleOk(values);
                formRef.current?.resetFields();
            });
    }

    return (
        <div>
            <Modal
                title={op === 'edit' ? t('actions.edit') : t('actions.new')}
                open={open}
                maskClosable={false}
                destroyOnClose={true}
                onOk={() => {
                    onOk()
                }}
                onCancel={() => {
                    formRef.current?.resetFields();
                    handleCancel();
                }}
                confirmLoading={confirmLoading}
            >
                <ProForm formRef={formRef} request={get} submitter={false} autoFocus={true}>
                    <ProFormText hidden={true} name={'key'}/>
                    <ProFormText name={'title'}
                                 label={t('general.name')}
                                 rules={[{required: true}]}
                                 fieldProps={{
                                     ref: inputRef,
                                     onPressEnter: (e) => {
                                         onOk()
                                     }
                                 }}
                    />
                </ProForm>
            </Modal>
        </div>
    );
};

export default AssetTreeModal;
import React, {useEffect, useRef, useState} from 'react';
import {Modal} from "antd";
import {
    ProForm,
    ProFormInstance,
    ProFormSelect,
    ProFormText,
    ProFormTextArea
} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import portalApi, {DatabaseAssetUser} from "@/api/portal-api.ts";

export interface DatabaseWorkOrderModalProps {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
}

const DatabaseWorkOrderModal = ({
                                    open,
                                    handleOk,
                                    handleCancel,
                                    confirmLoading,
                                }: DatabaseWorkOrderModalProps) => {
    const {t} = useTranslation();
    const formRef = useRef<ProFormInstance>(null);
    const [assets, setAssets] = useState<DatabaseAssetUser[]>([]);

    useEffect(() => {
        if (!open) {
            formRef.current?.resetFields();
            return;
        }
        portalApi.databaseAssets().then(setAssets).catch(() => setAssets([]));
    }, [open]);

    return (
        <Modal
            title={t('db.work_order.new')}
            open={open}
            maskClosable={false}
            destroyOnHidden={true}
            onOk={() => {
                formRef.current?.validateFields()
                    .then(async values => {
                        handleOk(values);
                    });
            }}
            onCancel={handleCancel}
            confirmLoading={confirmLoading}
        >
            <ProForm
                formRef={formRef}
                submitter={false}
            >
                <ProFormSelect
                    label={t('menus.resource.submenus.database_asset')}
                    name='assetId'
                    rules={[{required: true}]}
                    fieldProps={{
                        showSearch: true,
                        options: assets.map(item => ({
                            label: item.name,
                            value: item.id,
                        })),
                        filterOption: (input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase()),
                    }}
                />
                <ProFormText
                    label={t('db.asset.database')}
                    name='database'
                    rules={[{required: true}]}
                    placeholder={t('db.work_order.database_placeholder')}
                />
                <ProFormTextArea
                    label={t('db.sql_log.sql')}
                    name='sql'
                    rules={[{required: true}]}
                    fieldProps={{rows: 6}}
                />
                <ProFormTextArea
                    label={t('db.work_order.reason')}
                    name='requestReason'
                    rules={[{required: true}]}
                    fieldProps={{rows: 3}}
                    placeholder={t('db.work_order.reason_placeholder')}
                />
            </ProForm>
        </Modal>
    );
};

export default DatabaseWorkOrderModal;

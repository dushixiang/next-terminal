import React, {useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {
    ProForm,
    ProFormDependency,
    ProFormInstance,
    ProFormSelect,
    ProFormText,
    ProFormTextArea,
    ProFormTreeSelect
} from "@ant-design/pro-components";
import {Col, Modal, Popover, Row} from "antd";
import scheduledTaskApi, {ScheduledTask} from "@/src/api/scheduled-task-api";
import assetApi from "@/src/api/asset-api";
import ScheduledTaskRuntime from "@/src/pages/sysops/ScheduledTaskRuntime";

const ScheduledTaskModal = ({
                                open,
                                handleOk,
                                handleCancel,
                                confirmLoading,
                                id,
                            }: Props) => {
    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();
    let [spec, setSpec] = useState('');
    let [runtimeOpen, setRuntimeOpen] = useState(false);

    const get = async () => {
        if (id) {
            let data = await scheduledTaskApi.getById(id);
            setSpec(data.spec);
            return data
        }
        return {
            'type': 'asset-exec-command',
            'mode': 'all',
        } as ScheduledTask;
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
                <ProFormText label={t('general.name')} name={'name'} rules={[{required: true}]}/>
                <Row gutter={16}>
                    <Col span={12}>
                        <ProFormSelect label={t('sysops.type.label')}
                                       name={'type'}
                                       options={[
                                           {label: t('sysops.type.options.exec_command'), value: 'asset-exec-command'},
                                           {label: t('sysops.type.options.check_status'), value: 'asset-check-status'},
                                           {label: t('sysops.type.options.delete_log'), value: 'delete-history-log'},
                                           {
                                               label: t('sysops.type.options.renew_certificate'),
                                               value: 'renew-certificate'
                                           },
                                       ]}
                        />
                    </Col>
                    <Col span={12}>
                        <ProFormText label={t('sysops.spec')}
                                     name={'spec'}
                                     rules={[{required: true}]}
                                     tooltip={t('sysops.spec_tooltip')}
                                     fieldProps={{
                                         value: spec,
                                         onChange: (e) => {
                                             setSpec(e.target.value);
                                         },
                                         addonAfter: <div className={'cursor-pointer'}>
                                             <Popover
                                                 content={<ScheduledTaskRuntime open={runtimeOpen} spec={spec}/>}
                                                 title={t('sysops.spec_run_time')}
                                                 trigger="click"
                                                 placement="rightTop"
                                                 open={runtimeOpen}
                                                 onOpenChange={(open) => {
                                                     setRuntimeOpen(open);
                                                 }}
                                             >
                                                 {t('sysops.spec_run')}
                                             </Popover>
                                         </div>,
                                     }}
                        />
                    </Col>
                </Row>

                <ProFormDependency name={['type']}>
                    {({type}) => {
                        if (type === 'delete-history-log' || type === 'renew-certificate') {
                            return <></>
                        }
                        return <ProFormSelect
                            label={t('sysops.mode.label')}
                            name={'mode'}
                            options={[
                                {label: t('sysops.mode.options.all_asset'), value: 'all'},
                                {label: t('sysops.mode.options.custom_asset'), value: 'custom'},
                            ]}
                        />
                    }}
                </ProFormDependency>


                <ProFormDependency name={['mode']}>
                    {({mode}) => {
                        switch (mode) {
                            case 'all':
                                break;
                            case 'local':
                                break;
                            case 'custom':
                                return <ProFormTreeSelect
                                    label={t('sysops.asset')}
                                    name='assetIdList'
                                    rules={[{required: true}]}
                                    fieldProps={{
                                        multiple: true,
                                        showSearch: true,
                                        treeDefaultExpandAll: true,
                                        treeNodeFilterProp: "title",
                                    }}
                                    request={async () => {
                                        let items = await assetApi.tree('ssh');

                                        // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                                        function setKeyAndDisabled(item: any) {
                                            item.value = item.key;
                                            if (!item.isLeaf) {
                                                // item.disabled = true;
                                                // 递归处理子节点
                                                if (item.children) {
                                                    item.children.forEach(setKeyAndDisabled);
                                                }
                                            } else {
                                                item.title = item.title + ' (' + item.extra?.network + ')';
                                            }
                                        }

                                        // 对获取到的所有节点进行处理
                                        items.forEach((item: any) => {
                                            setKeyAndDisabled(item);
                                        });
                                        return items;
                                    }}
                                />
                        }
                        return <></>
                    }}
                </ProFormDependency>

                <ProFormDependency name={['type']}>
                    {({type}) => {
                        switch (type) {
                            case 'asset-exec-command':
                                return <ProFormTextArea label={t('sysops.command')} name='script'
                                                        rules={[{required: true}]}/>
                        }
                        return <></>
                    }}
                </ProFormDependency>


            </ProForm>
        </Modal>
    )
};

export interface Props {
    open: boolean
    handleOk: (values: any) => void
    handleCancel: () => void
    confirmLoading: boolean
    id: string | undefined
}

export default ScheduledTaskModal;
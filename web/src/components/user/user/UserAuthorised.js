import React, {useEffect, useState} from 'react';
import {Form, Modal, Select} from "antd";
import assetApi from "../../../api/asset";
import strategyApi from "../../../api/strategy";
import authorisedApi from "../../../api/authorised";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const UserAuthorised = ({type, id, visible, handleOk, handleCancel, confirmLoading}) => {
    const [form] = Form.useForm();

    let [selectedAssetIds, setSelectedAssetIds] = useState([]);
    let [assets, setAssets] = useState([]);
    let [strategies, setStrategies] = useState([]);

    useEffect(() => {
        async function fetchData() {

            let queryParam = {'key': 'assetId'};

            if (type === 'userId') {
                queryParam['userId'] = id;
            } else {
                queryParam['userGroupId'] = id;
            }

            let selectedAssetIds = await authorisedApi.GetSelected(queryParam);
            setSelectedAssetIds(selectedAssetIds);

            let assets = await assetApi.GetAll();
            setAssets(assets);

            let strategies = await strategyApi.GetAll();
            setStrategies(strategies);
        }

        if (visible) {
            fetchData();
        } else {
            form.resetFields();
        }
    }, [visible])

    return (
        <Modal
            title={'资产授权'}
            visible={visible}
            maskClosable={false}
            destroyOnClose={true}
            onOk={() => {
                form
                    .validateFields()
                    .then(async values => {
                        let ok = await handleOk(values);
                        if (ok) {
                            form.resetFields();
                        }
                    });
            }}
            onCancel={() => {
                form.resetFields();
                handleCancel();
            }}
            confirmLoading={confirmLoading}
            okText='确定'
            cancelText='取消'
        >

            <Form form={form} {...formItemLayout} >

                <Form.Item label="资产" name='assetIds' rules={[{required: true, message: '请选择资产'}]}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{width: '100%'}}
                        placeholder="请选择资产"
                    >
                        {assets.map(item => {
                            return <Select.Option key={item.id}
                                                  disabled={selectedAssetIds.includes(item.id)}>{item.name}</Select.Option>
                        })}
                    </Select>
                </Form.Item>

                <Form.Item label="授权策略" name='strategyId' extra={'可控制授权用户上传下载文件等功能'}>
                    <Select
                        allowClear
                        style={{width: '100%'}}
                        placeholder="此字段不是必填的"
                    >
                        {strategies.map(item => {
                            return <Select.Option key={item.id}>{item.name}</Select.Option>
                        })}
                    </Select>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default UserAuthorised;
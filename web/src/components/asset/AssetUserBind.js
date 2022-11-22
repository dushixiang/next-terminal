import React, {useEffect, useState} from 'react';
import {Form, Modal, Select} from "antd";
import authorisedApi from "../../api/authorised";
import strategyApi from "../../api/strategy";
import userApi from "../../api/user";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const AssetUserBind = ({id, visible, handleOk, handleCancel, confirmLoading}) => {
    const [form] = Form.useForm();

    let [selectedUserIds, setSelectedUserIds] = useState([]);
    let [users, setUsers] = useState([]);
    let [strategies, setStrategies] = useState([]);

    useEffect(() => {
        async function fetchData() {

            let queryParam = {'key': 'userId', 'assetId': id};

            let items = await authorisedApi.GetSelected(queryParam);
            setSelectedUserIds(items);

            let users = await userApi.getAll();
            setUsers(users);

            let strategies = await strategyApi.getAll();
            setStrategies(strategies);
        }

        if (visible) {
            fetchData();
        } else {
            form.resetFields();
        }
    }, [visible])

    let strategyOptions = strategies.map(item => {
        return {
            value: item.id,
            label: item.name
        }
    });

    let userOptions = users.map(item => {
        return {
            value: item.id,
            label: item.nickname,
            disabled: selectedUserIds.includes(item.id)
        }
    });

    return (
        <Modal
            title={'用户授权'}
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

                <Form.Item label="用户" name='userIds' rules={[{required: true, message: '请选择用户'}]}>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{width: '100%'}}
                        placeholder="请选择用户"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={userOptions}
                    >

                    </Select>
                </Form.Item>

                <Form.Item label="授权策略" name='strategyId' extra={'可控制授权用户上传下载文件等功能'}>
                    <Select
                        allowClear
                        style={{width: '100%'}}
                        placeholder="此字段不是必填的"
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={strategyOptions}
                    >

                    </Select>
                </Form.Item>

            </Form>
        </Modal>
    )
};

export default AssetUserBind;
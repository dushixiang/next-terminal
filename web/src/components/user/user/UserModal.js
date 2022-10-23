import React, {useState} from 'react';
import {Form, Input, Modal, Radio, Select} from "antd";
import userApi from "../../../api/user";
import roleApi from "../../../api/role";
import {useQuery} from "react-query";
import strings from "../../../utils/strings";

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const UserModal = ({visible, handleOk, handleCancel, confirmLoading, id}) => {

    const [form] = Form.useForm();

    let [userType, setUserType] = useState('user');

    let rolesQuery = useQuery('rolesQuery', roleApi.GetAll);

    useQuery('userQuery', () => userApi.getById(id), {
        enabled: visible && strings.hasText(id),
        onSuccess: (data) => {
            if (data.roles === null) {
                data.roles = undefined;
            }
            form.setFieldsValue(data);
            setUserType(data?.type);
        }
    });

    return (
        <Modal
            title={id ? '更新用户' : '新建用户'}
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
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>

                <Form.Item label="登录账户" name='username' rules={[{required: true, message: '请输入登录账户'}]}>
                    <Input autoComplete="off" placeholder="请输入登录账户"/>
                </Form.Item>

                <Form.Item label="昵称" name='nickname' rules={[{required: true, message: '请输入用户昵称'}]}>
                    <Input placeholder="请输入昵称"/>
                </Form.Item>

                <Form.Item label="类型" name='type' rules={[{required: true, message: '请选择用户角色'}]}>
                    <Radio.Group onChange={(e) => {
                        console.log(e.target.value);
                        setUserType(e.target.value);
                    }}>
                        <Radio value={'user'}>普通用户</Radio>
                        <Radio value={'admin'}>管理用户</Radio>
                    </Radio.Group>
                </Form.Item>

                {
                    userType === 'admin' &&
                    <Form.Item label="角色" name='roles' rules={[{required: true, message: '请选择用户角色'}]}>
                        <Select
                            mode="multiple"
                            allowClear
                            style={{width: '100%'}}
                            placeholder="请选择用户角色"
                        >
                            {rolesQuery.data?.map(role => {
                                return <Select.Option key={role.id}>{role.name}</Select.Option>
                            })}
                        </Select>
                    </Form.Item>
                }


                <Form.Item label="邮箱" name="mail"
                           rules={[{required: false, type: "email", message: '请输入正确的邮箱'}]}>
                    <Input type='email' placeholder="请输入邮箱"/>
                </Form.Item>

                {
                    !id ?
                        (<Form.Item label="登录密码" name='password'
                                    rules={[{required: true, message: '请输入登录密码'}]}>
                            <Input type="password" autoComplete="new-password" placeholder="输入登录密码"/>
                        </Form.Item>) : null
                }
            </Form>
        </Modal>
    )
};

export default UserModal;

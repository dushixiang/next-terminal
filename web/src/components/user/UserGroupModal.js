import {Form, Input, Modal, Select} from "antd";
import userGroupApi from "../../api/user-group";
import userApi from "../../api/user";
import {useQuery} from "react-query";
import strings from "../../utils/strings";

const api = userGroupApi;

const formItemLayout = {
    labelCol: {span: 6},
    wrapperCol: {span: 14},
};

const UserGroupModal = ({
                            visible,
                            handleOk,
                            handleCancel,
                            confirmLoading,
                            id,
                        }) => {

    const [form] = Form.useForm();

    useQuery('userGroupQuery', () => api.getById(id), {
        enabled: visible && strings.hasText(id),
        onSuccess: (data) => {
            data.members = data.members.map(item => item.id);
            form.setFieldsValue(data);
        }
    });

    let usersQuery = useQuery('usersQuery', userApi.getAll, {
        enabled: visible,
    });

    let users = usersQuery.data || [];

    return (
        <Modal
            title={id ? '更新用户组' : '新建用户组'}
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

            <Form form={form} {...formItemLayout}>
                <Form.Item name='id' noStyle>
                    <Input hidden={true}/>
                </Form.Item>

                <Form.Item label="名称" name='name' rules={[{required: true, message: '请输入用户组名称'}]}>
                    <Input autoComplete="off" placeholder="请输入用户组名称"/>
                </Form.Item>

                <Form.Item label="用户组成员" name='members'>
                    <Select
                        showSearch
                        mode="multiple"
                        allowClear
                        placeholder='用户组成员'
                        filterOption={false}
                    >
                        {users.map(d => <Select.Option key={d.id}
                                                       value={d.id}>{d['nickname']}</Select.Option>)}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
};

export default UserGroupModal;

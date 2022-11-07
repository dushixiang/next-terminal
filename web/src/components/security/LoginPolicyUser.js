import React, {useState} from 'react';
import {Button, Drawer} from "antd";
import {ProTable} from "@ant-design/pro-components";
import LoginPolicyBind from "./LoginPolicyBind";
import loginPolicyApi from "../../api/login-policy";
import Show from "../../dd/fi/show";

const actionRef = React.createRef();

const LoginPolicyUser = ({active, loginPolicyId}) => {

    let [visible, setVisible] = useState(false);

    const handleUnbind = async (userId) => {
        await loginPolicyApi.Unbind(loginPolicyId, [{'userId': userId}]);
        actionRef.current.reload();
    }

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '登录账号',
            dataIndex: 'username',
            copyable: true,
        },
        {
            title: '昵称',
            dataIndex: 'nickname',
            copyable: true,
        },
        {
            title: '邮箱',
            key: 'mail',
            dataIndex: 'mail',
        },
        {
            title: '创建时间',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'login-policy-unbind-user'}>
                    <a
                        key="unbind"
                        onClick={() => {
                            handleUnbind(record['id']);
                        }}
                    >
                        解绑
                    </a>
                </Show>,
            ],
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {

                    let field = '';
                    let order = '';
                    if (Object.keys(sort).length > 0) {
                        field = Object.keys(sort)[0];
                        order = Object.values(sort)[0];
                    }

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        name: params.name,
                        field: field,
                        order: order
                    }
                    let result = await loginPolicyApi.GetUserPagingByForbiddenCommandId(loginPolicyId, queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                        defaultPageSize: 10,
                    }}
                dateFormatter="string"
                headerTitle="绑定用户列表"
                toolBarRender={() => [
                    <Show menu={'login-policy-bind-user'}>
                        <Button key="button" type="primary" onClick={() => {
                            setVisible(true);
                        }}>
                            绑定
                        </Button>
                    </Show>,
                ]}
            />

            <Drawer title="绑定用户"
                    placement="right"
                    width={window.innerWidth * 0.7}
                    onClose={() => {
                        setVisible(false);
                        actionRef.current.reload();
                    }}
                    visible={visible}
            >
                <LoginPolicyBind visible={visible} loginPolicyId={loginPolicyId}/>
            </Drawer>
        </div>
    );
};

export default LoginPolicyUser;
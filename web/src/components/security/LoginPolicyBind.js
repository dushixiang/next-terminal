import React, {useEffect, useState} from 'react';
import {ProTable} from "@ant-design/pro-components";
import loginPolicyApi from "../../api/login-policy";
import userApi from "../../api/user";

const actionRef = React.createRef();

const LoginPolicyBind = ({visible, loginPolicyId}) => {

    let [bindKeys, setBindKeys] = useState([]);

    useEffect(() => {
        const x = async () => {
            let ids = await loginPolicyApi.GetUserIdByLoginPolicyId(loginPolicyId);
            setBindKeys(ids);
        }
        x();
    }, [visible]);

    const handleBind = async (userId) => {
        await loginPolicyApi.Bind(loginPolicyId, [{'userId': userId}]);
        bindKeys.push(userId);
        setBindKeys(bindKeys);
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
                <a
                    key="unbind"
                    onClick={() => {
                        handleBind(record['id']);
                    }}
                    disabled={bindKeys.includes(record['id'])}
                >
                    绑定
                </a>,
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
                    let result = await userApi.getPaging(queryParams);
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
                headerTitle="用户列表"
            />
        </div>
    );
};

export default LoginPolicyBind;
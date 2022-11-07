import React, {useEffect} from 'react';
import {ProTable} from '@ant-design/pro-components';
import {Link} from "react-router-dom";
import loginPolicyApi from "../../../api/login-policy";

const actionRef = React.createRef();

const UserLoginPolicy = ({active, userId}) => {

    useEffect(() => {
        if (active) {
            actionRef.current.reload();
        }
    }, [active]);

    const handleUnbind = async (loginPolicyId) => {
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
            title: '名称',
            dataIndex: 'name',
            render: (text, record) => {
                return <Link to={`/login-policy/${record['id']}`}>{text}</Link>;
            },
        },
        {
            title: '优先级',
            key: 'priority',
            dataIndex: 'priority',
            sorter: true,
            hideInSearch: true,
        },
        {
            title: '动作',
            key: 'rule',
            dataIndex: 'rule',
            hideInSearch: true,
            render: (text => {
                if (text === 'allow') {
                    return '允许';
                } else {
                    return '拒绝';
                }
            })
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <a
                    key="edit"
                    onClick={() => {
                        handleUnbind(record['id']);
                    }}
                >
                    解绑
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
                    if (!userId) {
                        return {
                            data: [],
                            success: true,
                            total: 0
                        };
                    }

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        name: params.name,
                        userId: userId,
                        field: field,
                        order: order
                    }
                    let result = await loginPolicyApi.getPaging(queryParams);
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
                headerTitle="用户登录策略"
                toolBarRender={() => [

                ]}
            />
        </div>
    );
};

export default UserLoginPolicy;
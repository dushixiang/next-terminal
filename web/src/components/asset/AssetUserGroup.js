import React, {useEffect, useState} from 'react';
import {Button} from "antd";
import authorisedApi from "../../api/authorised";
import {Link} from "react-router-dom";
import {ProTable} from "@ant-design/pro-components";
import AssetUserGroupBind from "./AssetUserGroupBind";
import Show from "../../dd/fi/show";

const actionRef = React.createRef();

const AssetUserGroup = ({id, active}) => {

    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);

    useEffect(() => {
        if (active) {
            actionRef.current.reload();
        }
    }, [active]);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '用户组名称',
            dataIndex: 'userGroupName',
            render: ((text, record) => {
                return <Link to={`/user-group/${record['userGroupId']}`}>{text}</Link>
            })
        },
        {
            title: '授权策略名称',
            dataIndex: 'strategyName',
            hideInSearch: true,
            render: ((text, record) => {
                return <Link to={`/strategy/${record['strategyId']}`}>{text}</Link>
            })
        },
        {
            title: '授权日期',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            width: 50,
            render: (text, record, _, action) => [
                <Show menu={'asset-authorised-user-group-del'} key={'unbind-acc'}>
                    <a
                        key="unbind"
                        onClick={async () => {
                            await authorisedApi.DeleteById(record['id']);
                            actionRef.current.reload();
                        }}
                    >
                        移除
                    </a>
                </Show>
                ,
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
                        assetId: id,
                        field: field,
                        order: order
                    }
                    let result = await authorisedApi.GetUserGroupPaging(queryParams);
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
                headerTitle="授权的用户组列表"
                toolBarRender={() => [
                    <Show menu={'asset-authorised-user-group-add'} key={'bind-acc'}>
                        <Button key="button" type="primary" onClick={() => {
                            setVisible(true);
                        }}>
                            授权
                        </Button>
                    </Show>
                    ,
                ]}
            />

            <AssetUserGroupBind
                id={id}
                visible={visible}
                confirmLoading={confirmLoading}
                handleCancel={() => {
                    setVisible(false);
                }}
                handleOk={async (values) => {
                    setConfirmLoading(true);
                    values['assetId'] = id;
                    try {
                        let success = authorisedApi.AuthorisedUserGroups(values);
                        if (success) {
                            setVisible(false);
                        }
                        actionRef.current.reload();
                    } finally {
                        setConfirmLoading(false);
                    }
                }}
            />
        </div>
    );
};

export default AssetUserGroup;
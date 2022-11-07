import React, {useEffect, useState} from 'react';
import {Button} from "antd";
import {ProTable} from "@ant-design/pro-components";
import authorisedApi from "../../../api/authorised";
import UserAuthorised from "./UserAuthorised";
import {Link} from "react-router-dom";
import Show from "../../../dd/fi/show";

const actionRef = React.createRef();

const UserAsset = ({active, id, type}) => {
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
            title: '资产名称',
            dataIndex: 'assetName',
            render: ((text, record) => {
                return <Link to={`/asset/${record['assetId']}`}>{text}</Link>
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
                <Show menu={['user-unbind-asset', 'user-group-unbind-asset']}>
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
                        field: field,
                        order: order
                    }
                    queryParams[type] = id;
                    let result = await authorisedApi.GetAssetPaging(queryParams);
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
                headerTitle="授权的资产列表"
                toolBarRender={() => [
                    <Show menu={['user-bind-asset', 'user-group-bind-asset']}>
                        <Button key="button" type="primary" onClick={() => {
                            setVisible(true);
                        }}>
                            授权
                        </Button>
                    </Show>,
                ]}
            />

            <UserAuthorised
                type={type}
                id={id}
                visible={visible}
                confirmLoading={confirmLoading}
                handleCancel={() => {
                    setVisible(false);
                }}
                handleOk={async (values) => {
                    setConfirmLoading(true);
                    values[type] = id;
                    try {
                        let success = authorisedApi.AuthorisedAssets(values);
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

export default UserAsset;



import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useTranslation} from "react-i18next";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import type {ProFormInstance} from "@ant-design/pro-components";
import {Button} from "antd";
import authorisedAssetApi, {Authorised} from "@/api/authorised-asset-api";
import {UserSelect, DepartmentSelect, AssetGroupSelect, AssetSelect} from "@/components/shared/QuerySelects";
import NButton from "@/components/NButton";
import NLink from "@/components/NLink";
import dayjs from "dayjs";
import {useNavigate, useSearchParams} from "react-router-dom";

const AuthorisedAssetPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    const formRef = useRef<ProFormInstance>();
    let navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const urlState = useMemo(() => ({
        userId: searchParams.get('userId') || undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        assetGroupId: searchParams.get('assetGroupId') || undefined,
        assetId: searchParams.get('assetId') || undefined,
    }), [searchParams]);

    const tableParams = useMemo(() => {
        const filtered = Object.fromEntries(
            Object.entries(urlState).filter(([, value]) => value)
        );
        return filtered;
    }, [urlState]);

    useEffect(() => {
        formRef.current?.setFieldsValue(urlState);
    }, [urlState]);

    const syncUrl = useCallback((values: Record<string, any>) => {
        const next: Record<string, string> = {};
        Object.entries(values).forEach(([key, value]) => {
            if (value) {
                next[key] = String(value);
            }
        });
        const sameSize = Object.keys(next).length === Object.keys(urlState).length;
        const isSame = sameSize && Object.entries(next).every(([key, value]) => urlState[key as keyof typeof urlState] === value);
        if (isSame) {
            return;
        }
        setSearchParams(next);
    }, [setSearchParams, urlState]);

    const columns: ProColumns<Authorised>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('authorised.label.user'),
            dataIndex: 'userName',
            formItemProps: {
                name: 'userId',
            },
            renderFormItem: (_, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }
                return <UserSelect {...rest} />;
            },
            render: ((text: any, record: any) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/user/${record.userId}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.department'),
            dataIndex: 'departmentName',
            formItemProps: {
                name: 'departmentId',
            },
            renderFormItem: (_, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }
                return <DepartmentSelect {...rest} />;
            },
            render: ((text: any, record: any) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/department/${record.departmentId}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.asset'),
            dataIndex: 'assetName',
            formItemProps: {
                name: 'assetId',
            },
            renderFormItem: (_, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }
                return <AssetSelect {...rest} />;
            },
            render: ((text, record) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/asset?assetId=${record['assetId']}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.asset_group'),
            dataIndex: 'assetGroupName',
            formItemProps: {
                name: 'assetGroupId',
            },
            renderFormItem: (_, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }
                return <AssetGroupSelect {...rest} />;
            },
            render: ((text: any, record: any) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/asset?groupId=${record.assetGroupId}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.expired_at'),
            key: 'expiredAt',
            dataIndex: 'expiredAt',
            hideInSearch: true,
            render: (text, record) => {
                if (record.expiredAt === 0) {
                    return '-';
                }
                let expiredAt = dayjs(record.expiredAt);
                const now = dayjs();
                const daysDifference = expiredAt.diff(now, 'day'); // 计算相差天数

                // 根据天数差异设置不同的类名
                let statusClass = '';
                if (daysDifference > 7) {
                    statusClass = 'text-green-500';  // 超过 7 天 - 绿色
                } else if (daysDifference > 0) {
                    statusClass = 'text-yellow-500';  // 小于 7 天但大于 0 天 - 黄色
                } else {
                    statusClass = 'text-red-500';  // 小于当前时间 - 红色
                }
                return <div className={statusClass}>
                    {expiredAt.format('YYYY-MM-DD HH:mm:ss')}
                </div>;
            },
            width: 180,
        },
        {
            title: t('authorised.label.authorised_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 180,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 50,
            render: (text, record, _, action) => [
                <NButton
                    key="unbind"
                    danger
                    onClick={async () => {
                        await authorisedAssetApi.deleteById(record['id']);
                        actionRef.current?.reload();
                    }}
                >
                    {t('actions.unbind')}
                </NButton>
                ,
            ],
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                formRef={formRef}
                params={tableParams}
                form={{
                    initialValues: urlState,
                }}
                onSubmit={(values) => syncUrl(values)}
                onReset={() => syncUrl({})}
                request={async (params = {}, sort, filter) => {

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        userId: params.userId,
                        departmentId: params.departmentId,
                        assetGroupId: params.assetGroupId,
                        assetId: params.assetId,
                    }
                    let result = await authorisedAssetApi.paging(queryParams);
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
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('authorised.label.authorised')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        navigate('/authorised-asset/post')
                    }}>
                        {t('actions.authorized')}
                    </Button>
                ]}
            />
        </div>
    );
};

export default AuthorisedAssetPage;

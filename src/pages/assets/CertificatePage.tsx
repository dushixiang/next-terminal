import React, {useRef, useState} from 'react';

import {App, Badge, Button, Tag, Tooltip} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import certificateApi, {Certificate} from "@/api/certificate-api";
import CertificateModal from "@/pages/assets/CertificateModal";
import CertificateDNSProviderModal from "@/pages/assets/CertificateDNSProviderModal";
import dnsProviderApi from "@/api/dns-provider-api";
import CertificateIssuedLog from "@/pages/assets/CertificateIssuedLog";

const api = certificateApi;

const CertificatePage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [dnsProviderOpen, setDnsProviderOpen] = useState<boolean>(false);
    let [logOpen, setLogOpen] = useState<boolean>(false);

    const {message, modal} = App.useApp();

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
        }
    }

    let mutationDNSProvider = useMutation({
        mutationFn: dnsProviderApi.set,
        onSuccess: () => {
            setDnsProviderOpen(false);
            message.open({
                type: 'success',
                content: t('general.success'),
            })
        }
    });

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey(undefined);
            showSuccess();
        }
    });


    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: ProColumns<Certificate>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('assets.certificates.common_name'),
            dataIndex: 'commonName',
        },
        {
            title: t('assets.certificates.type'),
            dataIndex: 'type',
            key: 'type',
            hideInSearch: true,
            width: 160,
            render: (type, record) => {
                switch (record.type) {
                    case 'self-signed':
                        return <Tag bordered={false} color="blue">{t('assets.certificates.self_signed')}</Tag>;
                    case'issued':
                        return <Tag bordered={false} color="orange">{t('assets.certificates.issued')}</Tag>;
                    case'imported':
                        return <Tag bordered={false} color="volcano">{t('assets.certificates.imported')}</Tag>;
                }
            }
        },
        {
            title: t('assets.certificates.is_default'),
            dataIndex: 'isDefault',
            key: 'isDefault',
            hideInSearch: true,
            width: 100,
            render: (type, record) => {
                if (record.isDefault) {
                    return <Tag bordered={false} color="green-inverse">{t('general.yes')}</Tag>;
                }
                return <Tag bordered={false} color="gray">{t('general.no')}</Tag>;
            },
            tooltip: t('assets.certificates.is_default_tooltip'),
        },
        {
            title: t('assets.certificates.issuer'),
            dataIndex: 'issuer',
            ellipsis: true,
        },
        {
            title: t('assets.certificates.issuedStatus'),
            dataIndex: 'issuedStatus',
            key: 'issuedStatus',
            hideInSearch: true,
            width: 120,
            render: (issuedStatus, record) => {
                switch (record.issuedStatus) {
                    case 'pending':
                        return <Badge status={'processing'} text={t('assets.certificates.issuedPending')}/>;
                    case 'success':
                        return <Badge status={'success'} text={t('assets.certificates.issuedSuccess')}/>;
                    case 'failed':
                        return <Tooltip title={record.issuedError}>
                            <Badge status={'error'} text={t('assets.certificates.issuedFailed')}/>
                        </Tooltip>;
                }
            }
        },
        {
            title: t('assets.certificates.not_after'),
            dataIndex: 'notAfter',
            key: 'notAfter',
            hideInSearch: true,
            valueType: 'dateTime',
            width: 191,
            defaultSortOrder: 'ascend',
            sorter: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 180,
            render: (text, record, _, action) => [
                <NButton
                    key="set_as_default"
                    onClick={() => {
                        api.updateAsDefault(record.id).then(() => {
                            action.reload();
                        })
                    }}
                    disabled={record.isDefault}
                >
                    {t('assets.certificates.set_as_default')}
                </NButton>,
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record.id);
                    }}
                    disabled={record.type === 'self-signed'}
                >
                    {t('actions.edit')}
                </NButton>,
                <TableDropdown
                    key="actionGroup"
                    menus={[
                        {
                            key: 'download',
                            name: t('assets.certificates.download'),
                            onClick: () => {
                                api.download(record.id, record.commonName);
                            }
                        },
                        {
                            key: 'renew',
                            name: t('assets.certificates.renew'),
                            disabled: record.type !== 'issued',
                            onClick: () => {
                                modal.confirm({
                                    title: t('assets.certificates.renew_confirm'),
                                    content: t('assets.certificates.renew_confirm_content'),
                                    onOk: async () => {
                                        try {
                                            const result = await api.renew(record.id);
                                            if (result.success) {
                                                message.success(t('general.success'));
                                                actionRef.current?.reload();
                                            } else if (result.warning) {
                                                message.warning(result.error || t('general.failed'));
                                            } else {
                                                message.error(result.error || t('general.failed'));
                                            }
                                        } catch (error: any) {
                                            const errorMsg = error?.response?.data?.message || error?.message || t('general.failed');
                                            message.error(errorMsg);
                                        }
                                    }
                                });
                            }
                        },
                        {
                            key: 'delete',
                            name: t('actions.delete'),
                            danger: true,
                            onClick: () => {
                                modal.confirm({
                                    title: t('general.delete_confirm'),
                                    onOk: async () => {
                                        await api.deleteById(record.id);
                                        actionRef.current?.reload();
                                    }
                                });
                            }
                        },
                    ]}
                />
            ],
        },
    ];

    return (<div className="">
        <ProTable
            columns={columns}
            actionRef={actionRef}
            request={async (params = {}, sort, filter) => {
                let [sortOrder, sortField] = getSort(sort);

                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder: sortOrder,
                    sortField: sortField,
                    name: params.name,
                }
                let result = await api.getPaging(queryParams);
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
            headerTitle={t('menus.resource.submenus.certificate')}
            toolBarRender={() => [
                <Button key="new" type="primary" onClick={() => {
                    setOpen(true)
                }}>
                    {t('actions.new')}
                </Button>,
                <Button key="dns-set"
                        color="purple"
                        variant="filled"
                        onClick={() => {
                            setDnsProviderOpen(true)
                        }}>
                    {t('assets.dns_providers.set')}
                </Button>,
                <Button key="dns-log"
                        color="orange"
                        variant="filled"
                        onClick={() => {
                            setLogOpen(true)
                        }}>
                    {t('assets.certificates.issued_log')}
                </Button>,
            ]}
        />

        <CertificateModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={mutation.mutate}
        />

        <CertificateDNSProviderModal
            open={dnsProviderOpen}
            handleCancel={() => {
                setDnsProviderOpen(false);
            }}
            handleOk={mutationDNSProvider.mutate}
        />

        <CertificateIssuedLog
            open={logOpen}
            onClose={() => {
                setLogOpen(false);
            }}
        />
    </div>);
}

export default CertificatePage;

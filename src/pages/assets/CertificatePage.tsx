import React, {useState} from 'react';

import {App, Badge, Button, Dropdown, Input, Space, Table, type TableProps, Tag, Tooltip, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation, useQuery} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import certificateApi, {Certificate} from "@/api/certificate-api";
import CertificateModal from "@/pages/assets/CertificateModal";
import CertificateDNSProviderModal from "@/pages/assets/CertificateDNSProviderModal";
import dnsProviderApi from "@/api/dns-provider-api";
import CertificateIssuedLog from "@/pages/assets/CertificateIssuedLog";
import dayjs from "dayjs";

const api = certificateApi;
const {Text} = Typography;

const CertificatePage = () => {

    const {t} = useTranslation();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [dnsProviderOpen, setDnsProviderOpen] = useState<boolean>(false);
    let [logOpen, setLogOpen] = useState<boolean>(false);
    let [pagination, setPagination] = useState({current: 1, pageSize: 10});
    let [sort, setSort] = useState<Record<string, string | null>>({notAfter: 'ascend'});
    let [keyword, setKeyword] = useState('');

    const {message, modal} = App.useApp();

    const certificatePagingQuery = useQuery({
        queryKey: ['certificates', pagination.current, pagination.pageSize, sort, keyword],
        queryFn: async () => {
            let [sortOrder, sortField] = getSort(sort);

            let queryParams = {
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                keyword: keyword || undefined,
            }
            return api.getPaging(queryParams);
        },
        refetchOnWindowFocus: false,
    });

    const reloadTable = () => {
        certificatePagingQuery.refetch();
    };

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
            reloadTable();
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

    const handleTableChange: TableProps<Certificate>['onChange'] = (nextPagination, filters, sorter) => {
        const activeSorter = Array.isArray(sorter) ? sorter.find((item) => item.order) : sorter;
        const field = activeSorter?.field;
        const fieldName = Array.isArray(field) ? field.join('.') : field ? String(field) : '';
        setSort(activeSorter?.order && fieldName ? {[fieldName]: activeSorter.order} : {});
        setPagination((prev) => ({
            ...prev,
            current: nextPagination.current || 1,
            pageSize: nextPagination.pageSize || prev.pageSize,
        }));
    };

    const columns: TableProps<Certificate>['columns'] = [
        {
            title: '#',
            key: 'index',
            width: 48,
            render: (_value, _record, index) => {
                return ((pagination.current - 1) * pagination.pageSize) + index + 1;
            },
        },
        {
            title: t('assets.domain'),
            dataIndex: 'commonName',
        },
        {
            title: t('assets.certificates.type'),
            dataIndex: 'type',
            key: 'type',
            width: 160,
            render: (_, record) => {
                switch (record.type) {
                    case 'self-signed':
                        return <Tag variant="filled" color="blue">{t('assets.certificates.self_signed')}</Tag>;
                    case'issued':
                        return <Tag variant="filled" color="orange">{t('assets.certificates.issued')}</Tag>;
                    case'imported':
                        return <Tag variant="filled" color="volcano">{t('assets.certificates.imported')}</Tag>;
                }
            }
        },
        {
            title: 'mTLS',
            dataIndex: 'requireClientAuth',
            key: 'requireClientAuth',
            width: 100,
            render: (_, record) => {
                if (record.requireClientAuth) {
                    return <Tag variant="solid" color="green">{t('general.yes')}</Tag>;
                }
                return <Tag variant="filled" color="gray">{t('general.no')}</Tag>;
            },
        },
        {
            title: (
                <Tooltip title={t('assets.certificates.is_default_tooltip')}>
                    <span>{t('assets.certificates.is_default')}</span>
                </Tooltip>
            ),
            dataIndex: 'isDefault',
            key: 'isDefault',
            width: 100,
            render: (_, record) => {
                if (record.isDefault) {
                    return <Tag variant="solid" color="green">{t('general.yes')}</Tag>;
                }
                return <Tag variant="filled" color="gray">{t('general.no')}</Tag>;
            },
        },
        {
            title: t('assets.certificates.issuer'),
            dataIndex: 'issuer',
            ellipsis: true,
            render: (text) => {
                if (!text) {
                    return '-';
                }
                return (
                    <Tooltip title={text} placement="topLeft">
                        <Text ellipsis style={{maxWidth: 260}}>{text}</Text>
                    </Tooltip>
                );
            },
        },
        {
            title: t('assets.certificates.issuedStatus'),
            dataIndex: 'issuedStatus',
            key: 'issuedStatus',
            width: 120,
            render: (_, record) => {
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
            width: 191,
            defaultSortOrder: 'ascend',
            sorter: true,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 180,
            render: (_text, record) => (
                <Space size={8}>
                    <NButton
                        onClick={() => {
                            api.updateAsDefault(record.id).then(() => {
                                reloadTable();
                            })
                        }}
                        disabled={record.isDefault}
                    >
                        {t('assets.certificates.set_as_default')}
                    </NButton>
                    <NButton
                        onClick={() => {
                            setOpen(true);
                            setSelectedRowKey(record.id);
                        }}
                        disabled={record.type === 'self-signed'}
                    >
                        {t('actions.edit')}
                    </NButton>
                    <Dropdown
                        menu={{
                            items: [
                                {key: 'download', label: t('assets.certificates.download')},
                                {
                                    key: 'renew',
                                    label: t('assets.certificates.renew'),
                                    disabled: record.type !== 'issued',
                                },
                                {key: 'delete', label: t('actions.delete'), danger: true},
                            ],
                            onClick: ({key}) => {
                                switch (key) {
                                    case 'download':
                                        api.download(record.id, record.commonName);
                                        break;
                                    case 'renew':
                                        modal.confirm({
                                            title: t('assets.certificates.renew_confirm'),
                                            content: t('assets.certificates.renew_confirm_content'),
                                            onOk: async () => {
                                                try {
                                                    const result = await api.renew(record.id);
                                                    if (result.success) {
                                                        message.success(t('general.success'));
                                                        reloadTable();
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
                                        break;
                                    case 'delete':
                                        modal.confirm({
                                            title: t('general.confirm_delete'),
                                            onOk: async () => {
                                                await api.deleteById(record.id);
                                                reloadTable();
                                            }
                                        });
                                        break;
                                }
                            }
                        }}
                    >
                        <Button type="link" size="small" style={{padding: 0}}>
                            {t('actions.more')}
                        </Button>
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (<div className="">
        <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
            <div
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="font-medium">{t('menus.resource.submenus.certificate')}</div>
                <Space wrap>
                    <Input.Search
                        allowClear
                        placeholder={t('general.search_placeholder')}
                        onSearch={(value) => {
                            setKeyword(value.trim());
                            setPagination((prev) => ({...prev, current: 1}));
                        }}
                        style={{width: 240}}
                    />
                    <Button loading={certificatePagingQuery.isFetching} onClick={reloadTable}>
                        {t('actions.refresh')}
                    </Button>
                    <Button type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                    <Button
                        color="purple"
                        variant="filled"
                        onClick={() => {
                            setDnsProviderOpen(true)
                        }}>
                        {t('assets.dns_providers.set')}
                    </Button>
                    <Button
                        color="orange"
                        variant="filled"
                        onClick={() => {
                            setLogOpen(true)
                        }}>
                        {t('assets.certificates.issued_log')}
                    </Button>
                </Space>
            </div>
            <Table<Certificate>
                columns={columns}
                dataSource={certificatePagingQuery.data?.items || []}
                loading={certificatePagingQuery.isFetching}
                rowKey="id"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: certificatePagingQuery.data?.total || 0,
                    showSizeChanger: true
                }}
                onChange={handleTableChange}
                size="small"
            />
        </div>

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

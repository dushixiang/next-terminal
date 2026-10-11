import {useEffect, useState} from 'react';
import {Alert, Button, Form, Input, Select, Switch, Typography} from 'antd';
import {SettingProps} from './SettingPage';
import {Trans, useTranslation} from 'react-i18next';
import DbProxyStats, {useDbProxyStats} from './DbProxyStats';
import {Link} from 'react-router-dom';
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import certificateApi from '@/api/certificate-api';

const {Paragraph, Text} = Typography;
type TLSMode = 'disabled' | 'optional' | 'required';
type MysqlForm = {
    'db-proxy-mysql-enabled': boolean;
    'db-proxy-addr': string;
    'db-proxy-public-addr': string;
    'db-proxy-mysql-tls-mode': TLSMode;
    'db-proxy-block-dml': boolean;
    'db-proxy-mysql-certificate-id': string;
};
const configKey = ['mysql-proxy-settings'];
const asBoolean = (value: unknown) => value === true || value === 'true';
const normalize = (values: Record<string, unknown>): MysqlForm => ({
    'db-proxy-mysql-enabled': asBoolean(values['db-proxy-mysql-enabled'] ?? values['db-proxy-enabled']),
    'db-proxy-addr': String(values['db-proxy-addr'] ?? ''),
    'db-proxy-public-addr': String(values['db-proxy-public-addr'] ?? ''),
    'db-proxy-mysql-tls-mode': (values['db-proxy-mysql-tls-mode'] || (asBoolean(values['db-proxy-mysql-tls-enabled']) ? 'optional' : 'disabled')) as TLSMode,
    'db-proxy-block-dml': asBoolean(values['db-proxy-block-dml']),
    'db-proxy-mysql-certificate-id': String(values['db-proxy-mysql-certificate-id'] ?? ''),
});

const MysqlProxySetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm<MysqlForm>();
    const enabled = Form.useWatch('db-proxy-mysql-enabled', form);
    const tlsMode = Form.useWatch('db-proxy-mysql-tls-mode', form);
    const certificateID = Form.useWatch('db-proxy-mysql-certificate-id', form);
    const [certificateSearch, setCertificateSearch] = useState('');
    const queryClient = useQueryClient();
    const config = useQuery({queryKey: configKey, queryFn: async () => normalize(await get()), refetchOnWindowFocus: false});
    const stats = useDbProxyStats(true);
    useEffect(() => {
        if (config.data && !form.isFieldsTouched()) {
            form.setFieldsValue(config.data);
        }
    }, [config.data, form]);

    const save = useMutation({
        mutationFn: async (values: MysqlForm) => set({...values, 'db-proxy-mysql-certificate-id': values['db-proxy-mysql-certificate-id'] || ''}),
        onSuccess: async (saved) => {
            if (saved !== true) return;
            const refreshed = await config.refetch();
            if (refreshed.data) {
                form.resetFields();
                form.setFieldsValue(refreshed.data);
            }
            await queryClient.invalidateQueries({queryKey: ['db-proxy-stats']});
        },
    });
    const certificates = useInfiniteQuery({
        queryKey: ['mysql-proxy-certificates', certificateSearch],
        initialPageParam: 1,
        queryFn: ({pageParam}) => certificateApi.getPaging({pageIndex: pageParam, pageSize: 50, keyword: certificateSearch}),
        getNextPageParam: (last, pages) => pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length + 1 : undefined,
        enabled: tlsMode !== undefined && tlsMode !== 'disabled',
        staleTime: 60_000,
    });
    const selectedCertificate = useQuery({
        queryKey: ['mysql-proxy-certificate', certificateID],
        queryFn: () => certificateApi.getById(certificateID),
        enabled: !!certificateID && tlsMode !== 'disabled',
        staleTime: 60_000,
    });
    const certificateItems = certificates.data?.pages.flatMap(page => page.items) ?? [];
    if (selectedCertificate.data && !certificateItems.some(item => item.id === selectedCertificate.data.id)) {
        certificateItems.push(selectedCertificate.data);
    }
    const active = stats.data?.mysql;
    const address = active?.publicAddr || active?.addr;
    const match = address?.match(/^(\[[^\]]+\]|[^:]+):(\d+)$/);
    const host = match?.[1].replace(/^\[|\]$/g, '') || 'host';
    const port = match?.[2] || 'port';
    const sslMode = active?.tlsMode === 'required' ? 'REQUIRED' : active?.tlsMode === 'optional' ? 'PREFERRED' : 'DISABLED';
    const shellValue = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;
    const command = `mysql -h ${shellValue(host)} -P ${port} -u username@asset_name -p --ssl-mode=${sslMode}`;

    return <div>
        <div className="mb-3"><Alert title={t('db.proxy.block_dml_tip')} type="info" showIcon/></div>
        <DbProxyStats type="mysql" enabled/>
        {(config.isError || save.isError) && <div className="mb-3"><Alert type="error" title={t('db.proxy.mysql_config_error')}/></div>}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
            <Form form={form} layout="vertical" disabled={config.isPending || config.isError || save.isPending} onFinish={values => save.mutate(values)}>
                <Form.Item name="db-proxy-mysql-enabled" label={t('db.proxy.mysql_enabled')} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
                <Form.Item name="db-proxy-addr" label={t('settings.sshd.addr')} rules={[{required: enabled}]}>
                    <Input disabled={!enabled} placeholder="0.0.0.0:3307"/>
                </Form.Item>
                <Form.Item name="db-proxy-public-addr" label={t('db.proxy.public_addr')} extra={t('db.proxy.public_addr_extra')}>
                    <Input disabled={!enabled} placeholder="db.example.com:3307"/>
                </Form.Item>
                <Form.Item name="db-proxy-block-dml" label={t('db.proxy.block_dml')} tooltip={t('db.proxy.block_dml_tip')} valuePropName="checked">
                    <Switch checkedChildren={t('general.yes')} unCheckedChildren={t('general.no')}/>
                </Form.Item>
                <Form.Item name="db-proxy-mysql-tls-mode" label={t('db.proxy.mysql_tls_mode')} extra={t('db.proxy.mysql_tls_mode_tip')} rules={[{required: true}]}>
                    <Select disabled={!enabled} options={['disabled', 'optional', 'required'].map(value => ({value, label: t(`db.proxy.mysql_tls_${value}`)}))}/>
                </Form.Item>
                {tlsMode !== undefined && tlsMode !== 'disabled' && <>
                    <Form.Item name="db-proxy-mysql-certificate-id" label={t('db.proxy.mysql_certificate')} extra={t('db.proxy.mysql_certificate_extra')}>
                        <Select allowClear placeholder={t('db.proxy.mysql_certificate_auto')}
                                loading={certificates.isFetching || selectedCertificate.isFetching}
                                showSearch={{filterOption: false, onSearch: setCertificateSearch}}
                                options={certificateItems.map(item => ({label: item.commonName, value: item.id}))}
                                onPopupScroll={event => {
                                    const element = event.currentTarget;
                                    if (element.scrollHeight - element.scrollTop - element.clientHeight < 40 && certificates.hasNextPage && !certificates.isFetchingNextPage) {
                                        void certificates.fetchNextPage();
                                    }
                                }}/>
                    </Form.Item>
                    {(certificates.isError || selectedCertificate.isError) && <div className="mb-3"><Alert type="error" title={t('db.proxy.mysql_certificate_error')}/></div>}
                </>}
                <Form.Item><Button type="primary" htmlType="submit" loading={save.isPending}>{t('actions.save')}</Button></Form.Item>
            </Form>
            <div className="space-y-3 border rounded-lg p-4">
                <div><div className="font-medium">{t('db.proxy.usage_title')}</div><Text type="secondary">{t('db.proxy.usage_tip')}</Text></div>
                <div>
                    <div className="font-medium">{t('db.proxy.usage_client')}</div>
                    {active?.running ? <Paragraph copyable style={{marginBottom: 0}}>{command}</Paragraph> : <Text type="secondary">{t('db.proxy.mysql_connection_unavailable')}</Text>}
                    <Paragraph type="secondary">{t('db.proxy.mysql_connection_tls_tip')}</Paragraph>
                </div>
                <div>
                    <div className="font-medium">{t('account.access_token_type_values.db_password')}</div>
                    <Paragraph style={{marginBottom: 0}}><Trans i18nKey="db.proxy.password_tip" components={{link: <Link to="/info?activeKey=access-token"/>}}/></Paragraph>
                </div>
            </div>
        </div>
    </div>;
};
export default MysqlProxySetting;

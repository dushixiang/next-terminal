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
type Policy = 'allow' | 'guarded';
type PgForm = {
    'db-proxy-pg-enabled': boolean;
    'db-proxy-pg-addr': string;
    'db-proxy-pg-public-addr': string;
    'db-proxy-pg-tls-mode': TLSMode;
    'db-proxy-pg-policy': Policy;
    'db-proxy-pg-certificate-id': string;
};
const configKey = ['pg-proxy-settings'];
const asBoolean = (value: unknown) => value === true || value === 'true';
const normalize = (values: Record<string, unknown>): PgForm => ({
    'db-proxy-pg-enabled': asBoolean(values['db-proxy-pg-enabled'] ?? values['db-proxy-enabled']),
    'db-proxy-pg-addr': String(values['db-proxy-pg-addr'] ?? ''),
    'db-proxy-pg-public-addr': String(values['db-proxy-pg-public-addr'] ?? ''),
    'db-proxy-pg-tls-mode': (values['db-proxy-pg-tls-mode'] || (asBoolean(values['db-proxy-pg-tls-enabled']) ? 'optional' : 'disabled')) as TLSMode,
    'db-proxy-pg-policy': (values['db-proxy-pg-policy'] || (asBoolean(values['db-proxy-block-dml']) ? 'guarded' : 'allow')) as Policy,
    'db-proxy-pg-certificate-id': String(values['db-proxy-pg-certificate-id'] ?? ''),
});

const PostgresProxySetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm<PgForm>();
    const enabled = Form.useWatch('db-proxy-pg-enabled', form);
    const tlsMode = Form.useWatch('db-proxy-pg-tls-mode', form);
    const certificateID = Form.useWatch('db-proxy-pg-certificate-id', form);
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
        mutationFn: async (values: PgForm) => set({...values, 'db-proxy-pg-certificate-id': values['db-proxy-pg-certificate-id'] || ''}),
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
        queryKey: ['pg-proxy-certificates', certificateSearch],
        initialPageParam: 1,
        queryFn: ({pageParam}) => certificateApi.getPaging({pageIndex: pageParam, pageSize: 50, keyword: certificateSearch}),
        getNextPageParam: (last, pages) => pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length + 1 : undefined,
        enabled: tlsMode !== undefined && tlsMode !== 'disabled',
        staleTime: 60_000,
    });
    const selectedCertificate = useQuery({
        queryKey: ['pg-proxy-certificate', certificateID],
        queryFn: () => certificateApi.getById(certificateID),
        enabled: !!certificateID && tlsMode !== 'disabled',
        staleTime: 60_000,
    });
    const certificateItems = certificates.data?.pages.flatMap(page => page.items) ?? [];
    if (selectedCertificate.data && !certificateItems.some(item => item.id === selectedCertificate.data.id)) {
        certificateItems.push(selectedCertificate.data);
    }
    const active = stats.data?.pg;
    const address = active?.publicAddr || active?.addr;
    const match = address?.match(/^(\[[^\]]+\]|[^:]+):(\d+)$/);
    const host = match?.[1].replace(/^\[|\]$/g, '') || 'host';
    const port = match?.[2] || 'port';
    const sslMode = active?.tlsMode === 'required' ? 'require' : active?.tlsMode === 'optional' ? 'prefer' : 'disable';
    const connValue = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const connection = `host=${connValue(host)} port=${port} user=username@asset_name dbname=postgres sslmode=${sslMode}`;
    const command = `psql '${connection.replace(/'/g, "'\\''")}'`;

    return <div>
        <div className="mb-3"><Alert title={t('db.proxy.pg_policy_tip')} type="info" showIcon/></div>
        <DbProxyStats type="pg" enabled/>
        {(config.isError || save.isError) && <div className="mb-3"><Alert type="error" title={t('db.proxy.pg_config_error')}/></div>}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
            <Form form={form} layout="vertical" disabled={config.isPending || config.isError || save.isPending} onFinish={values => save.mutate(values)}>
                <Form.Item name="db-proxy-pg-enabled" label={t('db.proxy.pg_enabled')} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
                </Form.Item>
                <Form.Item name="db-proxy-pg-addr" label={t('db.proxy.pg_addr')} rules={[{required: enabled}]}>
                    <Input disabled={!enabled} placeholder="0.0.0.0:5433"/>
                </Form.Item>
                <Form.Item name="db-proxy-pg-public-addr" label={t('db.proxy.public_addr')} extra={t('db.proxy.public_addr_extra')}>
                    <Input disabled={!enabled} placeholder="pg.example.com:5433"/>
                </Form.Item>
                <Form.Item name="db-proxy-pg-policy" label={t('db.proxy.pg_policy')} extra={t('db.proxy.pg_reject_tip')} rules={[{required: true}]}>
                    <Select options={['guarded', 'allow'].map(value => ({value, label: t(`db.proxy.pg_policy_${value}`)}))}/>
                </Form.Item>
                <Form.Item name="db-proxy-pg-tls-mode" label={t('db.proxy.pg_tls_mode')} extra={t('db.proxy.pg_tls_mode_tip')} rules={[{required: true}]}>
                    <Select disabled={!enabled} options={['disabled', 'optional', 'required'].map(value => ({value, label: t(`db.proxy.pg_tls_${value}`)}))}/>
                </Form.Item>
                {tlsMode !== undefined && tlsMode !== 'disabled' && <>
                    <Form.Item name="db-proxy-pg-certificate-id" label={t('db.proxy.pg_certificate')} extra={t('db.proxy.pg_certificate_extra')}>
                        <Select allowClear placeholder={t('db.proxy.pg_certificate_auto')}
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
                    {(certificates.isError || selectedCertificate.isError) && <div className="mb-3"><Alert type="error" title={t('db.proxy.pg_certificate_error')}/></div>}
                </>}
                <Form.Item><Button type="primary" htmlType="submit" loading={save.isPending}>{t('actions.save')}</Button></Form.Item>
            </Form>
            <div className="space-y-3 border rounded-lg p-4">
                <div><div className="font-medium">{t('db.proxy.usage_title')}</div><Text type="secondary">{t('db.proxy.usage_tip')}</Text></div>
                <div>
                    <div className="font-medium">{t('db.proxy.usage_client_pg')}</div>
                    {active?.running ? <Paragraph copyable style={{marginBottom: 0}}>{command}</Paragraph> : <Text type="secondary">{t('db.proxy.pg_connection_unavailable')}</Text>}
                    <Paragraph type="secondary">{t('db.proxy.pg_connection_tls_tip')}</Paragraph>
                </div>
                <div>
                    <div className="font-medium">{t('account.access_token_type_values.db_password')}</div>
                    <Paragraph style={{marginBottom: 0}}><Trans i18nKey="db.proxy.password_tip" components={{link: <Link to="/info?activeKey=access-token"/>}}/></Paragraph>
                </div>
            </div>
        </div>
    </div>;
};
export default PostgresProxySetting;

import React, {useEffect} from 'react';
import {App, Button, Card, Col, Descriptions, Row, Space, Spin, Typography} from "antd";
import dayjs from "dayjs";
import {useMutation, useQuery} from "@tanstack/react-query";
import licenseApi, {License} from "../../api/license-api";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {useLicense} from "@/src/hook/use-license";
import {useMobile} from "@/src/hook/use-mobile";

const {Title, Text} = Typography;

const LicenseSetting = () => {

    const { isMobile } = useMobile();
    const {message} = App.useApp();
    let {t} = useTranslation();

    let [licence, licenseQuery] = useLicense();

    let queryMachineId = useQuery({
        queryKey: ['machine-id'],
        queryFn: licenseApi.getMachineId,
    });

    let queryLicense = useQuery({
        queryKey: ['license'],
        queryFn: licenseApi.getLicense,
        initialData: {
            "type": "test",
            "machineId": "",
            "asset": 0,
            "concurrent": 0,
            "user": 0,
            "expired": 0
        } as License,
    });

    let mutation = useMutation({
        mutationFn: licenseApi.setLicense,
        onSuccess: () => {
            message.success(t('general.success'));
            queryLicense.refetch();
        }
    });

    let requestLicense = useMutation({
        mutationFn: licenseApi.requestLicense,
        onSuccess: () => {
            message.success(t('general.success'));
            queryLicense.refetch();
            licenseQuery.refetch();
        }
    });

    const renderType = (type: string | undefined) => {
        switch (type) {
            case 'free':
                return <span className={'text-gray-500'}>{t('settings.license.type.options.free')}</span>;
            case 'test':
                return <span className={'text-yellow-500'}>{t('settings.license.type.options.test')}</span>;
            case 'premium':
                return <span className={'text-green-500'}>{t('settings.license.type.options.premium')}</span>;
            case 'enterprise':
                return <span className={'text-blue-500'}>{t('settings.license.type.options.enterprise')}</span>;
            default:
                return type;
        }
    }

    const renderCount = (count: number | undefined) => {
        if (count === undefined) {
            return '-'
        }
        if (count <= 0) {
            return <span className={'text-green-600'}>∞</span>;
        }
        return count;
    }

    const renderTime = (time: number | undefined) => {
        if (!time) {
            return '-';
        }
        if (time <= 0) {
            return <span className={'text-green-600'}>∞</span>;
        }
        let expired = new Date().getTime() > time;
        return <>
            <span className={cn(
                expired && 'text-red-600',
                !expired && 'text-green-600',
            )}>
                {dayjs.unix(time / 1000).format('YYYY-MM-DD HH:mm:ss')}
            </span>
        </>;
    }

    const handleImportLicense = () => {
        let files = (document.getElementById('import-license') as HTMLInputElement)?.files;
        if (!files || files.length === 0) {
            return;
        }
        let file = files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            // 当读取完成时，内容只在`reader.result`中
            let license = reader.result as string;
            mutation.mutate({'license': license})
        };
        reader.readAsText(file, 'utf-8');
    }

    return (
        <div>
            <Title level={5} style={{marginTop: 0}}>{t('settings.license.setting')}</Title>

            <Row justify="space-around" gutter={[16, 16]}>
                <Col span={isMobile ? 24 : 12}>
                    <Spin spinning={queryMachineId.isLoading}>
                        <Card>
                            <Descriptions title={t('settings.license.device')} column={1}>
                                <Descriptions.Item label={t('settings.license.machine_id')}>
                                    <Text strong copyable>{queryMachineId.data}</Text>
                                </Descriptions.Item>
                            </Descriptions>

                            <Space className={cn('mt-4', isMobile && 'flex-wrap')} size={isMobile ? 'small' : 'middle'}>
                                <Button color="default" variant={'filled'} 
                                        size={isMobile ? 'small' : 'middle'}
                                        onClick={() => {
                                            window.document.getElementById('import-license')?.click();
                                        }}>
                                    {t('settings.license.import')}
                                </Button>
                                <input type="file" id="import-license" style={{display: 'none'}}
                                       onChange={handleImportLicense}/>

                                {!licence.isOEM() &&
                                    <Button color="primary" variant="filled"
                                            size={isMobile ? 'small' : 'middle'}
                                            href={'https://license.typesafe.cn/'}
                                            target={'_blank'}>
                                        {t('settings.license.binding')}
                                    </Button>
                                }
                                
                                <Button color="purple" variant="filled" 
                                        size={isMobile ? 'small' : 'middle'}
                                        loading={requestLicense.isPending}
                                        onClick={() => requestLicense.mutate()}
                                >
                                    {t('settings.license.request')}
                                </Button>
                            </Space>
                        </Card>
                    </Spin>
                </Col>
                <Col span={isMobile ? 24 : 12}>
                    <Spin spinning={queryLicense.isLoading}>
                        <Card>
                            <Descriptions title={t('settings.license.info')}
                                          column={1}
                                          styles={{
                                              label: {
                                                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                                  minWidth: isMobile ? 100 : 200,
                                              }
                                          }}
                            >
                                <Descriptions.Item label={t('settings.license.type.label')}>
                                    <Text strong>{renderType(queryLicense.data?.type)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('settings.license.machine_id')}>
                                    <Text strong>{queryLicense.data?.machineId}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('settings.license.max.asset_count')}>
                                    <Text strong>{renderCount(queryLicense.data?.asset)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('settings.license.max.concurrent_count')}>
                                    <Text strong>{renderCount(queryLicense.data?.concurrent)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('settings.license.max.user_count')}>
                                    <Text strong>{renderCount(queryLicense.data?.user)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={t('settings.license.expired_at')}>
                                    <Text strong>{renderTime(queryLicense.data?.expired)}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Spin>
                </Col>
            </Row>
        </div>
    );
};

export default LicenseSetting;
import {externalLinks} from "@/config/external-links";
import {App, Button, Card, Col, Descriptions, Form, Input, Radio, Row, Space, Spin, Typography} from "antd";
import dayjs from "dayjs";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useState} from "react";
import licenseApi, {License} from "../../api/license-api";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {useLicense} from "@/hook/LicenseContext";
import {useMobile} from "@/hook/use-mobile";
import propertyApi from "@/api/property-api";
import {AimOutlined, ExportOutlined} from "@ant-design/icons";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import accountApi from "@/api/account-api";

const {Text} = Typography;
const licenseDomainKey = 'license-domain';
const bindingTypeKey = 'license-binding-type';

const LicenseSetting = () => {

    const {isMobile} = useMobile();
    const {message} = App.useApp();
    const [form] = Form.useForm();
    const bindingType = Form.useWatch(bindingTypeKey, form);
    const [mfaOpen, setMfaOpen] = useState(false);
    const [pendingValues, setPendingValues] = useState<any>(null);
    let {t} = useTranslation();

    let {license: licence, refetch: licenseRefetch} = useLicense();

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
            "user": 0,
            "expired": 0
        } as License,
    });

    let queryProperties = useQuery({
        queryKey: ['properties', 'license-binding'],
        queryFn: async () => {
            let values = await propertyApi.get();
            let domain = values[licenseDomainKey] || '';
            form.setFieldsValue({
                [bindingTypeKey]: values[bindingTypeKey] || (domain ? 'domain' : 'machine'),
                [licenseDomainKey]: domain,
            });
            return values;
        },
    });

    const infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    });

    const saveBindingValues = async (values: any, securityToken?: string) => {
        let bindingType = values[bindingTypeKey] || 'machine';
        return await propertyApi.set({
            [bindingTypeKey]: bindingType,
            [licenseDomainKey]: bindingType === 'domain' ? values[licenseDomainKey] || '' : '',
        }, securityToken);
    }

    let saveDomain = useMutation({
        mutationFn: (values: any) => saveBindingValues(values),
        onSuccess: () => {
            message.success(t('general.success'));
            queryProperties.refetch();
        },
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
            licenseRefetch();
        }
    });

    const ensureMfaEnabled = async () => {
        if (infoQuery.data) {
            return infoQuery.data.mfaEnabled;
        }
        const res = await infoQuery.refetch();
        return res.data?.mfaEnabled ?? false;
    }

    const renderType = (type: string | undefined) => {
        switch (type) {
            case 'free':
                return <span className={'text-gray-500'}>{t('settings.license.type.free')}</span>;
            case 'test':
                return <span className={'text-yellow-500'}>{t('settings.license.type.test')}</span>;
            case 'premium':
                return <span className={'text-green-500'}>{t('settings.license.type.premium')}</span>;
            case 'enterprise':
                return <span className={'text-blue-500'}>{t('settings.license.type.enterprise')}</span>;
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

    const hasText = (value: string | undefined) => {
        return !!value && value.trim().length > 0;
    }

    const renderBindingType = (bindingType: string | undefined) => {
        if (bindingType === 'domain') {
            return t('settings.license.binding_type_domain');
        }
        return t('settings.license.binding_type_machine');
    }

    const validateLicenseDomain = (_: any, value: string | undefined) => {
        if (bindingType !== 'domain') {
            return Promise.resolve();
        }
        if (!value || value.trim().length === 0) {
            return Promise.reject(new Error(t('settings.license.domain_error')));
        }
        let domain = value.trim();
        if (domain.includes('://') || /[/?#:*]/.test(domain)) {
            return Promise.reject(new Error(t('settings.license.domain_error')));
        }
        if (!domain.includes('.')) {
            return Promise.reject(new Error(t('settings.license.domain_error')));
        }
        return Promise.resolve();
    }

    const handleAutoDetectDomain = () => {
        form.setFieldsValue({
            [bindingTypeKey]: 'domain',
            [licenseDomainKey]: window.location.hostname,
        });
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

    const handleRequestLicense = async () => {
        requestLicense.mutate();
    }

    const handleSaveBinding = async (values: any) => {
        let mfaEnabled = await ensureMfaEnabled();
        if (mfaEnabled) {
            setPendingValues({
                values,
            });
            setMfaOpen(true);
            return;
        }
        saveDomain.mutate(values);
    }

    const handleMfaOk = async (securityToken: string) => {
        if (!pendingValues) {
            setMfaOpen(false);
            return;
        }
        await saveBindingValues(pendingValues.values, securityToken);
        message.success(t('general.success'));
        queryProperties.refetch();
        setPendingValues(null);
        setMfaOpen(false);
    }

    const handleMfaCancel = () => {
        setPendingValues(null);
        setMfaOpen(false);
    }

    return (
        <div>
            <Row justify="space-around" gutter={[16, 16]}>
                <Col span={isMobile ? 24 : 12}>
                    <Spin spinning={queryMachineId.isLoading || queryProperties.isLoading}>
                        <Card
                            title={t('settings.license.license_binding_type')}
                            extra={externalLinks.licensePortal && !licence.isOEM() &&
                                <Button
                                    type="link"
                                    icon={<ExportOutlined/>}
                                    href={externalLinks.licensePortal}
                                    target={'_blank'}
                                >
                                    {t('settings.license.binding')}
                                </Button>
                            }
                        >
                            <input type="file" id="import-license" style={{display: 'none'}}
                                   onChange={handleImportLicense}/>

                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleSaveBinding}
                                initialValues={{
                                    [bindingTypeKey]: 'machine',
                                }}
                            >
                                <Form.Item
                                    name={bindingTypeKey}
                                >
                                    <Radio.Group
                                        optionType="button"
                                        buttonStyle="solid"
                                        onChange={(event) => {
                                            if (event.target.value === 'machine') {
                                                form.setFieldsValue({
                                                    [licenseDomainKey]: '',
                                                });
                                            }
                                        }}
                                        options={[
                                            {
                                                label: t('settings.license.binding_type_machine'),
                                                value: 'machine',
                                            },
                                            {
                                                label: t('settings.license.binding_type_domain'),
                                                value: 'domain',
                                            },
                                        ]}
                                    />
                                </Form.Item>
                                {bindingType !== 'domain' &&
                                    <div className="mb-4">
                                        <Descriptions
                                            column={1}
                                            items={[
                                                {
                                                    key: 'machine-id',
                                                    label: t('settings.license.machine_id'),
                                                    children: <Text strong copyable>{queryMachineId.data}</Text>,
                                                },
                                            ]}
                                        />
                                    </div>
                                }
                                {bindingType === 'domain' &&
                                    <Form.Item
                                        label={t('settings.license.domain')}
                                        tooltip={t('settings.license.domain_tip')}
                                        required
                                    >
                                        <Space.Compact block>
                                            <Form.Item
                                                name={licenseDomainKey}
                                                noStyle
                                                rules={[{validator: validateLicenseDomain}]}
                                            >
                                                <Input placeholder="nt.example.com"/>
                                            </Form.Item>
                                            <Button
                                                icon={<AimOutlined/>}
                                                onClick={handleAutoDetectDomain}
                                            >
                                                {t('settings.license.auto_detect_domain')}
                                            </Button>
                                        </Space.Compact>
                                    </Form.Item>
                                }
                                <Space className={cn(isMobile && 'flex-wrap')} size={isMobile ? 'small' : 'middle'}>
                                    <Button type="primary" htmlType="submit" loading={saveDomain.isPending}>
                                        {t('actions.save')}
                                    </Button>

                                    <Button color="default" variant={'filled'}
                                            size={isMobile ? 'small' : 'middle'}
                                            onClick={() => {
                                                window.document.getElementById('import-license')?.click();
                                            }}>
                                        {t('settings.license.import')}
                                    </Button>

                                    <Button color="purple" variant="filled"
                                            size={isMobile ? 'small' : 'middle'}
                                            loading={requestLicense.isPending}
                                            onClick={handleRequestLicense}
                                    >
                                        {t('settings.license.request')}
                                    </Button>
                                </Space>
                            </Form>
                        </Card>
                    </Spin>
                </Col>
                <Col span={isMobile ? 24 : 12}>
                    <Spin spinning={queryLicense.isLoading}>
                        <Card>
                            <Descriptions title={t('settings.license.info')}
                                          column={1}
                                          items={[
                                              {
                                                  key: 'type',
                                                  label: t('settings.license.type.label'),
                                                  children: <Text strong>{renderType(queryLicense.data?.type)}</Text>,
                                              },
                                              {
                                                  key: 'binding-type',
                                                  label: t('settings.license.license_binding_type'),
                                                  children: <Text strong>{renderBindingType(queryLicense.data?.bindingType)}</Text>,
                                              },
                                              ...(hasText(queryLicense.data?.name) ? [{
                                                  key: 'name',
                                                  label: t('settings.license.name'),
                                                  children: <Text strong>{queryLicense.data?.name}</Text>,
                                              }] : []),
                                              ...(hasText(queryLicense.data?.userName) ? [{
                                                  key: 'user-name',
                                                  label: t('settings.license.user_name'),
                                                  children: <Text strong>{queryLicense.data?.userName}</Text>,
                                              }] : []),
                                              queryLicense.data?.bindingType === 'domain' ? {
                                                  key: 'domain',
                                                  label: t('settings.license.domain'),
                                                  children: <Text strong>{queryLicense.data?.domain || '-'}</Text>,
                                              } : {
                                                  key: 'machine-id',
                                                  label: t('settings.license.machine_id'),
                                                  children: <Text strong>{queryLicense.data?.machineId}</Text>,
                                              },
                                              {
                                                  key: 'asset-count',
                                                  label: t('settings.license.max.asset_count'),
                                                  children: <Text strong>{renderCount(queryLicense.data?.asset)}</Text>,
                                              },
                                              {
                                                  key: 'user-count',
                                                  label: t('settings.license.max.user_count'),
                                                  children: <Text strong>{renderCount(queryLicense.data?.user)}</Text>,
                                              },
                                              {
                                                  key: 'expired-at',
                                                  label: t('settings.license.expired_at'),
                                                  children: <Text strong>{renderTime(queryLicense.data?.expired)}</Text>,
                                              },
                                          ]}
                                          styles={{
                                              label: {
                                                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                                  minWidth: isMobile ? 100 : 200,
                                              }
                                          }}
                            />
                        </Card>
                    </Spin>
                </Col>
            </Row>
            <MultiFactorAuthentication open={mfaOpen} handleOk={handleMfaOk} handleCancel={handleMfaCancel}/>
        </div>
    );
};

export default LicenseSetting;

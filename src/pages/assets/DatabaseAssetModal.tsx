import {useFormRequest} from "@/hook/use-antd-form-query";
import {useEffect, useState} from 'react';
import {App, Button, Col, Collapse, Form, Input, InputNumber, Modal, Row, Select, Space} from 'antd';
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import databaseAssetApi from "@/api/database-asset-api";
import {EyeInvisibleOutlined, EyeTwoTone} from "@ant-design/icons";
import MultiFactorAuthentication from "@/pages/account/MultiFactorAuthentication";
import ConnectionModeFields from "@/pages/assets/components/ConnectionModeFields";

const api = databaseAssetApi;

interface DatabaseAssetModalProps {
    open: boolean;
    handleOk: (values: any) => void;
    handleCancel: () => void;
    confirmLoading: boolean;
    id: string | undefined;
}

const DatabaseAssetModal = ({
                                open,
                                handleOk,
                                handleCancel,
                                confirmLoading,
                                id
                            }: DatabaseAssetModalProps) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm();
    const databaseType = Form.useWatch('type', form);
    const [decrypted, setDecrypted] = useState(false);
    const [mfaOpen, setMfaOpen] = useState(false);
    const formItemStyle = {marginBottom: 12};

    useEffect(() => {
        if (!open) {
            setDecrypted(false);
            setMfaOpen(false);
        }
    }, [open]);
    const get = async () => {
        if (id) {
            const asset = await api.getById(id);
            return {
                ...asset,
                connectionMode: asset.connectionMode || 'direct',
                gatewayChain: asset.gatewayChain || []
            };
        }
        return {
            type: 'mysql',
            port: 3306,
            connectionMode: 'direct',
            gatewayChain: [],
            attrs: {
                'postgres-ssl-mode': 'prefer'
            },
            tags: []
        };
    };
    const handleSave = () => {
        form.validateFields().then(async values => {
            delete values.gatewaySource;

            handleOk(values);
        });
    };
    const testMutation = useMutation({
        mutationFn: api.test,
        onSuccess: () => {
            message.success(t('general.success'));
        }
    });
    const handleTest = () => {
        form.validateFields().then(values => {
            delete values.gatewaySource;

            testMutation.mutate(values);
        });
    };
    const footer = <Space size={8}>
        <Button onClick={handleCancel}>
            {t('actions.cancel')}
        </Button>
        <Button onClick={handleTest} loading={testMutation.isPending}>
            {t('actions.test_connection')}
        </Button>
        <Button type="primary" loading={confirmLoading} onClick={handleSave}>
            {t('actions.save')}
        </Button>
    </Space>;

    useFormRequest(form, ["form-request", "web/src/pages/assets/DatabaseAssetModal.tsx", open, id], get, {enabled: open});
    return <Modal title={id ? t('actions.edit') : t('actions.new')}
                  open={open}
                  onCancel={handleCancel}
                  destroyOnHidden={true}
                  mask={{
                      closable: true,
                  }}
                  footer={footer}
    >
        <Form form={form} clearOnDestroy={true} layout="vertical">
            <Form.Item hidden={true} name={'id'}>
                <Input/>
            </Form.Item>
            <Space orientation="vertical" size={8} style={{width: '100%'}}>
                <Form.Item name={'name'} label={t('general.name')} rules={[{required: true}]} style={formItemStyle}>
                    <Input/>
                </Form.Item>

                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label={t('db.asset.type')} name='type' rules={[{required: true}]}
                                   style={formItemStyle}>
                            <Select onChange={type => {
                                const currentPort = form.getFieldValue('port');
                                if (!currentPort || type === 'pg' && currentPort === 3306) {
                                    form.setFieldValue('port', 5432);
                                } else if (type === 'mysql' && currentPort === 5432) {
                                    form.setFieldValue('port', 3306);
                                }
                            }} options={[{
                                label: t('db.asset.type_mysql'),
                                value: 'mysql'
                            }, {
                                label: t('db.asset.type_pg'),
                                value: 'pg'
                            }]}/>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('assets.tags')} name='tags' style={formItemStyle}>
                            <Select
                                mode='tags'
                                showSearch/>
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item label={t('general.remark')} name='description' style={formItemStyle}>
                            <Input.TextArea rows={3}/>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={12}>
                    <Col xs={24} md={16}>
                        <Form.Item name={'host'} label={t('db.asset.host')} rules={[{required: true}]}
                                   style={formItemStyle}>
                            <Input/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name={'port'} label={t('gateways.port')} rules={[{required: true}]}
                                   style={formItemStyle}>
                            <InputNumber min={1} max={65535} style={{width: '100%'}}/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name={'username'} label={t('assets.username')}
                                   rules={[{required: true}]} style={formItemStyle}>
                            <Input autoComplete='off'/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item label={t('assets.password')} name='password' style={formItemStyle}>
                            <Input.Password
                                autoComplete='new-password'
                                iconRender={visible => visible ? <EyeTwoTone/> : <EyeInvisibleOutlined/>}
                                visibilityToggle={{
                                    onVisibleChange: visible => {
                                        if (id && visible && !decrypted) {
                                            setMfaOpen(true);
                                        }
                                    }
                                }}/>
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name='database' label={t('db.asset.database')}
                                   extra={<div>
                                       <div>{t(databaseType === 'pg' ? 'db.asset.postgres_database_extra' : 'db.asset.mysql_database_extra')}</div>
                                       <div>{t('db.asset.database_access_extra')}</div>
                                   </div>} style={formItemStyle}>
                            <Input allowClear/>
                        </Form.Item>
                    </Col>
                    {databaseType === 'pg' && <Col span={24}>
                        <Form.Item label={t('db.asset.postgres_ssl_mode')}
                                   extra={t('db.asset.postgres_ssl_mode_extra')}
                                   name={['attrs', 'postgres-ssl-mode']}
                                   style={formItemStyle}>
                            <Select options={[
                                {label: 'disable', value: 'disable'},
                                {label: 'prefer', value: 'prefer'},
                                {label: 'require', value: 'require'},
                                {label: 'verify-ca', value: 'verify-ca'},
                                {label: 'verify-full', value: 'verify-full'}
                            ]}/>
                        </Form.Item>
                    </Col>}
                </Row>

                <Collapse
                    className="w-full"
                    bordered={false}
                    items={[
                        {
                            key: 'advanced-settings',
                            label: t('assets.advanced_settings'),
                            forceRender: true,
                            children: <ConnectionModeFields/>
                        }
                    ]}
                />
            </Space>
        </Form>

        <MultiFactorAuthentication
            open={mfaOpen}
            handleOk={async securityToken => {
                if (!id) {
                    return;
                }
                const res = await api.decrypt(id, securityToken);
                form.setFieldsValue({
                    password: res.password
                });
                setDecrypted(true);
                setMfaOpen(false);
            }}
            handleCancel={() => setMfaOpen(false)}
        />
    </Modal>;
};
export default DatabaseAssetModal;

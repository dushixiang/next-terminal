import React, {useEffect} from 'react';
import {App, Drawer, Form} from 'antd';
import {
    ProForm,
    ProFormDependency,
    ProFormDigit,
    ProFormList,
    ProFormRadio,
    ProFormSelect,
    ProFormSwitch,
    ProFormText,
    ProFormTextArea,
} from '@ant-design/pro-components';
import {useTranslation} from 'react-i18next';
import gatewayGroupApi, {GatewayGroup} from '@/api/gateway-group-api';
import sshGatewayApi from '@/api/ssh-gateway-api';
import agentGatewayApi from '@/api/agent-gateway-api';

interface Props {
    open: boolean;
    group?: GatewayGroup;
    onClose: (success?: boolean) => void;
}

const GatewayGroupDrawer: React.FC<Props> = ({open, group, onClose}) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && group) {
            form.setFieldsValue(group);
        } else if (open) {
            form.resetFields();
            form.setFieldsValue({
                selectionMode: 'priority',
                members: [],
            });
        }
    }, [open, group, form]);

    const handleSubmit = async (values: any) => {
        try {
            if (group?.id) {
                await gatewayGroupApi.updateById(group.id, values);
            } else {
                await gatewayGroupApi.create(values);
            }
            message.success(t('general.success'));
            onClose(true);
        } catch (error) {
            console.error('Submit failed:', error);
        }
    };

    const sshGatewayRequest = async () => {
        const items = await sshGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    const agentGatewayRequest = async () => {
        const items = await agentGatewayApi.getAll();
        return items.map(item => ({
            label: item.name,
            value: item.id,
        }));
    };

    return (
        <Drawer
            title={group ? t('gateway_group.edit') : t('gateway_group.create')}
            width={720}
            open={open}
            onClose={() => onClose()}
            destroyOnHidden
        >
            <ProForm
                form={form}
                onFinish={handleSubmit}
                submitter={{
                    searchConfig: {
                        submitText: t('actions.confirm'),
                        resetText: t('actions.cancel'),
                    },
                    resetButtonProps: {
                        onClick: () => onClose(),
                    },
                }}
            >
                <ProFormText
                    name="name"
                    label={t('gateway_group.name')}
                    rules={[{required: true}]}
                    placeholder={t('gateway_group.name_placeholder')}
                />

                <ProFormTextArea
                    name="description"
                    label={t('general.description')}
                    placeholder={t('gateway_group.description_placeholder')}
                />

                <ProFormRadio.Group
                    name="selectionMode"
                    label={t('gateway_group.selection_mode')}
                    rules={[{required: true}]}
                    options={[
                        {label: t('gateway_group.mode_priority'), value: 'priority'},
                        {label: t('gateway_group.mode_latency'), value: 'latency'},
                        {label: t('gateway_group.mode_random'), value: 'random'},
                    ]}
                />

                <ProFormList
                    name="members"
                    label={t('gateway_group.members')}
                    creatorButtonProps={{
                        creatorButtonText: t('gateway_group.add_member'),
                    }}
                    min={1}
                    copyIconProps={false}
                    itemRender={({listDom, action}, {index}) => (
                        <div style={{
                            marginBottom: 16,
                            padding: 16,
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                            position: 'relative'
                        }}>
                            <div style={{position: 'absolute', top: 8, right: 8}}>
                                {action}
                            </div>
                            <div style={{marginBottom: 8, fontWeight: 'bold'}}>
                                {t('gateway_group.member')} {index + 1}
                            </div>
                            {listDom}
                        </div>
                    )}
                >
                    <ProFormRadio.Group
                        name="gatewayType"
                        label={t('assets.gateway_type')}
                        rules={[{required: true}]}
                        options={[
                            {label: t('menus.gateway.submenus.ssh_gateway'), value: 'ssh'},
                            {label: t('menus.gateway.submenus.agent_gateway'), value: 'agent'},
                        ]}
                    />

                    <ProFormDependency name={['gatewayType']}>
                        {({gatewayType}) => {
                            if (!gatewayType) {
                                return null;
                            }
                            const isSsh = gatewayType === 'ssh';
                            return (
                                <ProFormSelect
                                    key={gatewayType}
                                    name="gatewayId"
                                    label={isSsh ? t('menus.gateway.submenus.ssh_gateway') : t('menus.gateway.submenus.agent_gateway')}
                                    rules={[{required: true}]}
                                    request={isSsh ? sshGatewayRequest : agentGatewayRequest}
                                    params={{gatewayType}}
                                    showSearch
                                />
                            );
                        }}
                    </ProFormDependency>

                    <ProFormDigit
                        name="priority"
                        label={t('identity.policy.priority')}
                        tooltip={t('gateway_group.priority_tooltip')}
                        initialValue={0}
                        min={0}
                        fieldProps={{precision: 0}}
                    />

                    <ProFormSwitch
                        name="enabled"
                        label={t('general.enabled')}
                        initialValue={true}
                    />
                </ProFormList>
            </ProForm>
        </Drawer>
    );
};

export default GatewayGroupDrawer;

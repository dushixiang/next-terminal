import QuerySelect from "@/components/QuerySelect";
import React, { useEffect } from 'react';
import { App, Drawer, Form, Input, Radio, InputNumber, Switch, Button, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import gatewayGroupApi, { GatewayGroup } from '@/api/gateway-group-api';
import sshGatewayApi from '@/api/ssh-gateway-api';
import agentGatewayApi from '@/api/agent-gateway-api';
interface Props {
  open: boolean;
  group?: GatewayGroup;
  onClose: (success?: boolean) => void;
}
const GatewayGroupDrawer: React.FC<Props> = ({
  open,
  group,
  onClose
}) => {
  const {
    t
  } = useTranslation();
  const {
    message
  } = App.useApp();
  const [form] = Form.useForm();
  useEffect(() => {
    if (open && group) {
      form.setFieldsValue(group);
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        selectionMode: 'priority',
        members: []
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
      value: item.id
    }));
  };
  const agentGatewayRequest = async () => {
    const items = await agentGatewayApi.getAll();
    return items.map(item => ({
      label: item.name,
      value: item.id
    }));
  };
  return <Drawer title={group ? t('gateway_group.edit') : t('gateway_group.create')} size={720} open={open} onClose={() => onClose()} destroyOnHidden>
            <Form form={form} onFinish={handleSubmit} layout="vertical">
                <Form.Item name="name" label={t('gateway_group.name')} rules={[{
        required: true
      }]}>
    <Input placeholder={t('gateway_group.name_placeholder')} />
      </Form.Item>

                <Form.Item name="description" label={t('general.description')}>
    <Input.TextArea placeholder={t('gateway_group.description_placeholder')} />
      </Form.Item>

                <Form.Item name="selectionMode" label={t('gateway_group.selection_mode')} rules={[{
        required: true
      }]}>
    <Radio.Group options={[{
          label: t('gateway_group.mode_priority'),
          value: 'priority'
        }, {
          label: t('gateway_group.mode_latency'),
          value: 'latency'
        }, {
          label: t('gateway_group.mode_random'),
          value: 'random'
        }]} />
      </Form.Item>

                <Form.Item label={t('gateway_group.members')} required>
                  <Form.List name="members">
                    {(fields, {add, remove}) => <>
                      {fields.map((field, index) => (
                        <div key={field.key} style={{
                          marginBottom: 16,
                          padding: 16,
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 8
                          }}>
                            <Button type="link" danger onClick={() => remove(field.name)}>
                              -
                            </Button>
                          </div>
                          <div style={{
                            marginBottom: 8,
                            fontWeight: 'bold'
                          }}>
                            {t('gateway_group.member')} {index + 1}
                          </div>
                          <Form.Item name={[field.name, 'gatewayType']} label={t('assets.gateway_type')} rules={[{
                            required: true
                          }]}>
                            <Radio.Group options={[{
                              label: t('menus.gateway.submenus.ssh_gateway'),
                              value: 'ssh'
                            }, {
                              label: t('menus.gateway.submenus.agent_gateway'),
                              value: 'agent'
                            }]} />
                          </Form.Item>

                          <Form.Item noStyle shouldUpdate>
                            {form => {
                              const gatewayType = form.getFieldValue(['members', field.name, 'gatewayType']);
                              if (!gatewayType) {
                                return null;
                              }
                              const isSsh = gatewayType === 'ssh';
                              return (
                                <Form.Item key={gatewayType} name={[field.name, 'gatewayId']} label={isSsh ? t('menus.gateway.submenus.ssh_gateway') : t('menus.gateway.submenus.agent_gateway')} rules={[{
                                  required: true
                                }]}>
                                  <QuerySelect showSearch params={{gatewayType}} request={isSsh ? sshGatewayRequest : agentGatewayRequest} />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>

                          <Form.Item name={[field.name, 'priority']} label={t('identity.policy.priority')} tooltip={t('gateway_group.priority_tooltip')} initialValue={0}>
                            <InputNumber precision={0} min={0} style={{width: "100%"}} />
                          </Form.Item>

                          <Form.Item name={[field.name, 'enabled']} label={t('general.enabled')} initialValue={true} valuePropName="checked">
                            <Switch />
                          </Form.Item>
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block>
                        {t('gateway_group.add_member')}
                      </Button>
                    </>}
                  </Form.List>
                </Form.Item>
            
      <Form.Item><Space><Button htmlType="button" onClick={() => onClose()}>{t('actions.cancel')}</Button><Button type="primary" htmlType="submit">{t('actions.confirm')}</Button></Space></Form.Item>
    </Form>
        </Drawer>;
};
export default GatewayGroupDrawer;

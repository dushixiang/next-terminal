import { useFormRequest } from "@/hook/use-antd-form-query";
import React, { useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { FormInstance, Col, Modal, Popover, Row, Form, Input, Select } from 'antd';
import scheduledTaskApi, { ScheduledTask } from "@/api/scheduled-task-api";
import assetApi from "@/api/asset-api";
import ScheduledTaskRuntime from "@/pages/sysops/ScheduledTaskRuntime";
import ProFormTreeSelect from "@/components/ProFormTreeSelect";
const ScheduledTaskModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: Props) => {
  let {
    t
  } = useTranslation();
  const formRef = useRef<FormInstance>(null);
  let [spec, setSpec] = useState('');
  let [runtimeOpen, setRuntimeOpen] = useState(false);
  const get = async () => {
    if (id) {
      let data = await scheduledTaskApi.getById(id);
      setSpec(data.spec);
      return data;
    }
    return {
      'type': 'asset-exec-command',
      'mode': 'all'
    } as ScheduledTask;
  };
  useFormRequest(formRef, ["form-request", "web/src/pages/sysops/ScheduledTaskModal.tsx", open, id], get, open);
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    formRef.current?.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>
            <Form ref={formRef} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item label={t('general.name')} name={'name'} rules={[{
        required: true
      }]}>
    <Input />
      </Form.Item>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label={t('assets.type')} name={'type'}>
    <Select options={[{
              label: t('sysops.type.options.exec_command'),
              value: 'asset-exec-command'
            }, {
              label: t('sysops.type.options.check_status'),
              value: 'asset-check-status'
            }, {
              label: t('sysops.type.options.delete_log'),
              value: 'delete-history-log'
            }, {
              label: t('assets.certificates.renew'),
              value: 'renew-certificate'
            }]} />
          </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label={t('sysops.spec')} name={'spec'} rules={[{
            required: true
          }]} tooltip={t('sysops.spec_tooltip')}>
    <Input
              value={spec}
              onChange={e => {
                setSpec(e.target.value);
              }}
              addonAfter={<div className={'cursor-pointer'}>
                                             <Popover content={<ScheduledTaskRuntime open={runtimeOpen} spec={spec} />} title={t('sysops.spec_run_time')} trigger="click" placement="rightTop" open={runtimeOpen} onOpenChange={open => {
                  setRuntimeOpen(open);
                }}>
                                                 {t('sysops.spec_run')}
                                             </Popover>
                                         </div>} />
          </Form.Item>
                    </Col>
                </Row>

                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          type
        }) => {
          if (type === 'delete-history-log' || type === 'renew-certificate') {
            return <></>;
          }
          return <Form.Item label={t('sysops.mode.label')} name={'mode'}>
    <Select options={[{
              label: t('sysops.mode.options.all_asset'),
              value: 'all'
            }, {
              label: t('sysops.mode.options.custom_asset'),
              value: 'custom'
            }]} />
          </Form.Item>;
        })(form.getFieldsValue(true), form)}</Form.Item>


                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          mode
        }) => {
          switch (mode) {
            case 'all':
              break;
            case 'local':
              break;
            case 'custom':
              return <ProFormTreeSelect label={t('menus.resource.submenus.asset')} name='assetIdList' rules={[{
                required: true
              }]} fieldProps={{
                multiple: true,
                showSearch: true,
                treeDefaultExpandAll: true,
                treeNodeFilterProp: "title"
              }} request={async () => {
                let items = await assetApi.tree('ssh');

                // 递归把 key 字段设置为 value，并且非叶子节点全部 disabled
                function setKeyAndDisabled(item: any) {
                  item.value = item.key;
                  if (!item.isLeaf) {
                    // item.disabled = true;
                    // 递归处理子节点
                    if (item.children) {
                      item.children.forEach(setKeyAndDisabled);
                    }
                  } else {
                    item.title = item.title + ' (' + item.extra?.network + ')';
                  }
                }

                // 对获取到的所有节点进行处理
                items.forEach((item: any) => {
                  setKeyAndDisabled(item);
                });
                return items;
              }} />;
          }
          return <></>;
        })(form.getFieldsValue(true), form)}</Form.Item>

                <Form.Item noStyle={true} shouldUpdate={true}>{form => (({
          type
        }) => {
          switch (type) {
            case 'asset-exec-command':
              return <Form.Item label={t('sysops.command')} name='script' rules={[{
                required: true
              }]}>
    <Input.TextArea />
              </Form.Item>;
          }
          return <></>;
        })(form.getFieldsValue(true), form)}</Form.Item>


            </Form>
        </Modal>;
};
export interface Props {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id: string | undefined;
}
export default ScheduledTaskModal;

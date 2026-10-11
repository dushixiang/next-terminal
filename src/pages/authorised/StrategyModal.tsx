import { useFormRequest } from "@/hook/use-antd-form-query";
import {Modal, Space, Form, Input, Switch} from 'antd';
import { useTranslation } from "react-i18next";
import strategyApi from "@/api/strategy-api";
const api = strategyApi;
interface StrategyProps {
  open: boolean;
  handleOk: (values: any) => void;
  handleCancel: () => void;
  confirmLoading: boolean;
  id?: string;
}
const StrategyModal = ({
  open,
  handleOk,
  handleCancel,
  confirmLoading,
  id
}: StrategyProps) => {
  const [form] = Form.useForm();
  let {
    t
  } = useTranslation();
  const get = async () => {
    if (id) {
      return await api.getById(id);
    }
    return {};
  };
  useFormRequest(form, ["form-request", "web/src/pages/authorised/StrategyModal.tsx", open, id], get, {enabled: open});
  return <Modal title={id ? t('actions.edit') : t('actions.new')} open={open} mask={{
    closable: false
  }} destroyOnHidden={true} onOk={() => {
    form.validateFields().then(async values => {
      handleOk(values);
    });
  }} onCancel={() => {
    handleCancel();
  }} confirmLoading={confirmLoading}>

            <Form form={form} clearOnDestroy={true} layout="vertical">
                <Form.Item hidden={true} name={'id'}>
    <Input />
      </Form.Item>
                <Form.Item name={'name'} label={t('general.name')}>
    <Input />
      </Form.Item>

                <Space orientation={'vertical'}>
                    <Space>
                        <Form.Item name={'upload'} label={t('authorised.strategy.upload')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'download'} label={t('authorised.strategy.download')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>

                    <Space>
                        <Form.Item name={'createDir'} label={t('authorised.strategy.create_dir')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'createFile'} label={t('authorised.strategy.create_file')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>

                    <Space>
                        <Form.Item name={'edit'} label={t('authorised.strategy.edit')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'delete'} label={t('authorised.strategy.delete')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'rename'} label={t('authorised.strategy.rename')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>


                    <Space>
                        <Form.Item name={'copy'} label={t('authorised.strategy.copy')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                        <Form.Item name={'paste'} label={t('authorised.strategy.paste')} valuePropName="checked">
    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')} />
          </Form.Item>
                    </Space>
                </Space>

            </Form>
        </Modal>;
};
export default StrategyModal;

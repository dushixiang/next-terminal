import { Form, InputNumber, Select, Switch } from "antd";
import React from 'react';
import { useTranslation } from "react-i18next";
interface DisplaySettingsProps {
  protocol: 'rdp' | 'vnc';
}
const DisplaySettings: React.FC<DisplaySettingsProps> = ({
  protocol
}) => {
  const {
    t
  } = useTranslation();
  const resizeMethod = Form.useWatch(["attrs", "resize-method"]);
  let resizeMethodDescription = t('assets.resize_method_extra');
  switch (resizeMethod) {
    case 'display-update':
      resizeMethodDescription = t('assets.resize_methods.display_update_desc');
      break;
    case 'reconnect':
      resizeMethodDescription = t('assets.resize_methods.reconnect_desc');
      break;
  }
  return <>
            <Form.Item name={["attrs", "color-depth"]} label={t("assets.color_depth")}>
    <Select
        options={[{
          value: '',
          label: t('general.default')
        }, {
          value: '8',
          label: '8'
        }, {
          value: '16',
          label: '16'
        }, {
          value: '24',
          label: '24'
        }, {
          value: '32',
          label: '32'
        }]} />
    </Form.Item>
            <Form.Item name={["attrs", "force-lossless"]} label={t('assets.force_lossless')} valuePropName="checked">
    <Switch />
    </Form.Item>
            <Form.Item name={['attrs', 'width']} label={t('assets.width')}>
    <InputNumber
        precision={0} // 只允许整数
      style={{
        width: "100%"
      }} />
    </Form.Item>
            <Form.Item name={['attrs', 'height']} label={t('assets.height')}>
    <InputNumber
        precision={0} // 只允许整数
      style={{
        width: "100%"
      }} />
    </Form.Item>
            {protocol === 'rdp' && <>
                    <Form.Item name={["attrs", "resize-method"]} label={t('assets.resize_method')}>
    <Select
          options={[{
            value: '',
            label: t('general.default')
          }, {
            value: 'display-update',
            label: t('assets.resize_methods.display_update')
          }, {
            value: 'reconnect',
            label: t('assets.resize_methods.reconnect')
          }]} />
      </Form.Item>
                    <div style={{
            marginTop: '-16px',
            marginBottom: '16px',
            marginLeft: 'calc(16.666667% + 8px)',
            // 与label宽度对齐
            fontSize: '12px',
            color: '#666'
          }}>
                                    {resizeMethodDescription}
                                </div>
                </>}
        </>;
};
export default DisplaySettings;

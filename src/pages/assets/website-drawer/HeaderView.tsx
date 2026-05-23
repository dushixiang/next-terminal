import React from 'react';
import {Button, Card, Form, Space, Input} from "antd";
import { useTranslation } from "react-i18next";
const HeaderView: React.FC = () => {
  const {
    t
  } = useTranslation();
  return <div className="flex flex-col gap-4">
            <div>
                <Form.Item label={t('assets.custom_header')} tooltip={t('assets.custom_header_tip')}>
                    <Form.List name="headers" initialValue={[]}>
                        {(fields, {add, remove}) => <>
                            {fields.map(field => (
                                <Card key={field.key} size="small" className="mb-3 bg-slate-50/60 dark:bg-slate-900/40">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <Space>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <Form.Item name={[field.name, 'name']} label={t('assets.header_key')}>
                                                        <Input placeholder="Content-Type" />
                                                    </Form.Item>
                                                    <Form.Item name={[field.name, 'value']} label={t('assets.header_value')}>
                                                        <Input placeholder="application/json" />
                                                    </Form.Item>
                                                </div>
                                            </Space>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <Button type="link" danger onClick={() => remove(field.name)}>
                                                -
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            <Button type="dashed" onClick={() => add()} block>
                                +
                            </Button>
                        </>}
                    </Form.List>
                </Form.Item>
            </div>
        </div>;
};
export default HeaderView;

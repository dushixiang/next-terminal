import React from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  Card,
  Space,
  InputNumber,
  Switch,
  Typography,
  Tooltip,
  Modal,
  notification
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

const WebsiteModifyResponseView = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    console.log('Received values of form:', JSON.stringify(values, null, 2));
    // Here you would typically send the 'values' to your backend.
    notification.success({
      message: 'Rules Saved',
      description: 'HTTP response modification rules have been successfully saved (console logged).',
      placement: 'topRight',
    });
  };

  const handleValuesChange = (changedValues, allValues) => {
    // Optional: You can add logic here to react to form changes.
    // console.log('Changed values:', changedValues);
    // console.log('All values:', allValues);
  };

  // Helper function to render key-value pairs for headers
  const renderKeyValueFields = (fieldName, label, tooltip) => (
    <Form.List name={fieldName}>
      {(fields, { add, remove }) => (
        <>
          <Text strong>{label}</Text>
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined style={{ marginLeft: 8, cursor: 'pointer' }} />
          </Tooltip>
          {fields.map(({ key, name, fieldKey, ...restField }) => (
            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item
                {...restField}
                name={[name, 'key']}
                fieldKey={[fieldKey, 'key']}
                rules={[{ required: true, message: 'Missing key' }]}
              >
                <Input placeholder="Key" />
              </Form.Item>
              <Form.Item
                {...restField}
                name={[name, 'value']}
                fieldKey={[fieldKey, 'value']}
                rules={[{ required: true, message: 'Missing value' }]}
              >
                <Input placeholder="Value" />
              </Form.Item>
              <MinusCircleOutlined onClick={() => remove(name)} />
            </Space>
          ))}
          <Form.Item>
            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
              Add {label.toLowerCase().slice(0, -1)}
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );

  return (
    <Card title="Modify HTTP Response Rules" style={{ maxWidth: 1200, margin: '20px auto' }}>
      <Form
        form={form}
        name="http_response_modifier"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        layout="vertical"
        initialValues={{
          modifyRules: [
            {
              name: 'Example Rule',
              match: {
                method: 'GET',
                status: 200,
              },
            },
          ],
        }}
      >
        <Form.List name="modifyRules">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, fieldKey, ...restField }) => (
                <Card
                  key={key}
                  title={
                    <Input
                      placeholder="Rule Name"
                      style={{ width: 'calc(100% - 60px)' }}
                      defaultValue={form.getFieldValue(['modifyRules', name, 'name'])}
                      onChange={(e) => {
                        const newRules = form.getFieldValue('modifyRules');
                        newRules[name].name = e.target.value;
                        form.setFieldsValue({ modifyRules: newRules });
                      }}
                    />
                  }
                  extra={
                    fields.length > 1 ? (
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        style={{ fontSize: '20px', color: 'red' }}
                      />
                    ) : null
                  }
                  style={{ marginBottom: 24 }}
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'name']}
                    fieldKey={[fieldKey, 'name']}
                    rules={[{ required: true, message: 'Please enter a rule name' }]}
                    noStyle // Hide the default Antd Form.Item label and wrapper
                  >
                    {/* Input is rendered in the Card title, so this Form.Item is mostly for data binding */}
                    <Input type="hidden" />
                  </Form.Item>

                  <h3>Match Conditions</h3>
                  <Form.Item
                    {...restField}
                    name={[name, 'match', 'path']}
                    fieldKey={[fieldKey, 'match', 'path']}
                    label="Path"
                    tooltip="Path to match, e.g., /api/data"
                  >
                    <Input placeholder="/hello" />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'match', 'method']}
                    fieldKey={[fieldKey, 'match', 'method']}
                    label="Method"
                    tooltip="HTTP method to match"
                  >
                    <Select placeholder="Select a method" allowClear>
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                      <Option value="PATCH">PATCH</Option>
                      <Option value="HEAD">HEAD</Option>
                      <Option value="OPTIONS">OPTIONS</Option>
                    </Select>
                  </Form.Item>

                  {renderKeyValueFields(
                    [name, 'match', 'headers'],
                    'Match Headers',
                    'Headers that must be present in the request for the rule to apply (key-value pairs).'
                  )}

                  <Form.Item
                    {...restField}
                    name={[name, 'match', 'status']}
                    fieldKey={[fieldKey, 'match', 'status']}
                    label="Status Code"
                    tooltip="HTTP status code to match, e.g., 200, 404"
                  >
                    <InputNumber min={100} max={599} placeholder="200" style={{ width: '100%' }} />
                  </Form.Item>

                  <h3>Actions</h3>
                  {renderKeyValueFields(
                    [name, 'actions', 'set_headers'],
                    'Set Headers',
                    'Headers to set/override in the response.'
                  )}
                  {renderKeyValueFields(
                    [name, 'actions', 'add_headers'],
                    'Add Headers',
                    'Headers to add to the response if not already present.'
                  )}
                  <Form.List name={[name, 'actions', 'remove_headers']}>
                    {(fields, { add, remove }) => (
                      <>
                        <Text strong>Remove Headers</Text>
                        <Tooltip title="Headers to remove from the response (specify only the header key).">
                          <QuestionCircleOutlined style={{ marginLeft: 8, cursor: 'pointer' }} />
                        </Tooltip>
                        {fields.map(({ key, name: subName, fieldKey, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restField}
                              name={[subName]}
                              fieldKey={[fieldKey]}
                              rules={[{ required: true, message: 'Missing header key' }]}
                            >
                              <Input placeholder="Header Key to Remove" />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(subName)} />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            Add Header to Remove
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Form.List name={[name, 'actions', 'body_replace']}>
                    {(fields, { add, remove }) => (
                      <>
                        <Text strong>Body Replace Rules</Text>
                        <Tooltip title="Define rules to search and replace text within the response body.">
                          <QuestionCircleOutlined style={{ marginLeft: 8, cursor: 'pointer' }} />
                        </Tooltip>
                        {fields.map(({ key, name: subName, fieldKey, ...restField }) => (
                          <Card
                            key={key}
                            size="small"
                            title={`Replacement Rule ${subName + 1}`}
                            extra={<MinusCircleOutlined onClick={() => remove(subName)} />}
                            style={{ marginBottom: 16 }}
                          >
                            <Form.Item
                              {...restField}
                              name={[subName, 'search']}
                              fieldKey={[fieldKey, 'search']}
                              label="Search"
                              rules={[{ required: true, message: 'Please enter search text' }]}
                            >
                              <Input placeholder="Text to search for" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[subName, 'replace']}
                              fieldKey={[fieldKey, 'replace']}
                              label="Replace"
                              rules={[{ required: true, message: 'Please enter replacement text' }]}
                            >
                              <Input placeholder="Text to replace with" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[subName, 'is_regex']}
                              fieldKey={[fieldKey, 'is_regex']}
                              label="Is Regex?"
                              valuePropName="checked"
                              tooltip="Check if the search text should be treated as a regular expression."
                            >
                              <Switch />
                            </Form.Item>
                          </Card>
                        ))}
                        <Form.Item>
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            Add Body Replace Rule
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Card>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Response Modification Rule
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Submit All Rules
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default WebsiteModifyResponseView;
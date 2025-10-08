import React, {useState} from 'react';
import {
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    message,
    notification,
    Row,
    Select,
    Space,
    Switch,
    Tooltip,
    Typography
} from 'antd';
import {MinusCircleOutlined, PlusOutlined, QuestionCircleOutlined} from '@ant-design/icons';

const {Option} = Select;
const {Text} = Typography;

interface BodyReplaceRule {
    search: string;
    is_regex: boolean;
    replace: string;
}

interface KeyValuePair {
    key: string;
    value: string;
}

interface ModifyRule {
    name: string;
    match: {
        path?: string;
        method?: string;
        status?: number;
    };
    actions: {
        set_headers?: KeyValuePair[];
        add_headers?: KeyValuePair[];
        remove_headers?: string[];
        body_replace?: BodyReplaceRule[];
    };
}

interface FormData {
    modifyRules: ModifyRule[];
}

const WebsiteModifyResponseView = () => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: FormData) => {
        setLoading(true);
        try {
            // 这里转换数据格式以匹配后端需求
            const formattedRules = values.modifyRules.map(rule => ({
                ...rule,
                actions: {
                    ...rule.actions,
                    // 将键值对数组转换为对象
                    set_headers: rule.actions.set_headers || [],
                    add_headers: rule.actions.add_headers || [],
                    remove_headers: rule.actions.remove_headers || [],
                    body_replace: rule.actions.body_replace || []
                }
            }));

            const payload = {
                modifyRules: formattedRules
            };

            console.log('提交的数据:', JSON.stringify(payload, null, 2));

            // 这里应该调用您的 API
            // await saveModifyRules(payload);

            notification.success({
                message: '保存成功',
                description: 'HTTP 响应修改规则已成功保存',
                placement: 'topRight',
            });
        } catch (error) {
            message.error('保存失败，请重试');
            console.error('保存失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 渲染键值对字段
    const renderKeyValueFields = (fieldName: any[], label: string, tooltip: string) => (
        <Form.List name={fieldName}>
            {(fields, {add, remove}) => (
                <>
                    <Row align="middle" style={{marginBottom: 8}}>
                        <Col>
                            <Text strong>{label}</Text>
                            <Tooltip title={tooltip}>
                                <QuestionCircleOutlined style={{marginLeft: 8, cursor: 'pointer'}}/>
                            </Tooltip>
                        </Col>
                    </Row>
                    {fields.map(({key, name, ...restField}) => (
                        <Row gutter={8} key={key} style={{marginBottom: 8}}>
                            <Col flex="1">
                                <Form.Item
                                    {...restField}
                                    name={[name, 'key']}
                                    rules={[{required: true, message: '请输入键'}]}
                                    style={{marginBottom: 0}}
                                >
                                    <Input placeholder="键"/>
                                </Form.Item>
                            </Col>
                            <Col flex="1">
                                <Form.Item
                                    {...restField}
                                    name={[name, 'value']}
                                    rules={[{required: true, message: '请输入值'}]}
                                    style={{marginBottom: 0}}
                                >
                                    <Input placeholder="值"/>
                                </Form.Item>
                            </Col>
                            <Col>
                                <MinusCircleOutlined
                                    onClick={() => remove(name)}
                                    style={{color: '#ff4d4f', fontSize: '16px'}}
                                />
                            </Col>
                        </Row>
                    ))}
                    <Form.Item>
                        <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined/>}
                            style={{marginTop: 8}}
                        >
                            添加{label.replace('Headers', '头部').replace('Set ', '设置').replace('Add ', '添加')}
                        </Button>
                    </Form.Item>
                </>
            )}
        </Form.List>
    );

    return (
        <div style={{}}>
            <Form.List name="modifyRules">
                {(fields, {add, remove}) => (
                    <>
                        {fields.map(({key, name, ...restField}) => (
                            <Card
                                key={key}
                                type="inner"
                                title={
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'name']}
                                        rules={[{required: true, message: '请输入规则名称'}]}
                                        style={{marginBottom: 0}}
                                    >
                                        <Input placeholder="规则名称"/>
                                    </Form.Item>
                                }
                                extra={
                                    fields.length > 0 ? (
                                        <MinusCircleOutlined
                                            onClick={() => remove(name)}
                                            style={{fontSize: '16px', color: '#ff4d4f',marginLeft: 8, cursor: 'pointer'}}
                                        />
                                    ) : null
                                }
                                style={{marginBottom: 24}}
                            >
                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Card title="匹配条件" size="small" style={{marginBottom: 16}}>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'match', 'path']}
                                                label="请求路径"
                                                tooltip="要匹配的请求路径，例如: /api/data（为空时匹配所有路径）"
                                            >
                                                <Input placeholder="/hello"/>
                                            </Form.Item>

                                            <Form.Item
                                                {...restField}
                                                name={[name, 'match', 'method']}
                                                label="请求方法"
                                                tooltip="要匹配的 HTTP 方法（为空时匹配所有方法）"
                                            >
                                                <Select placeholder="选择请求方法" allowClear>
                                                    <Option value="GET">GET</Option>
                                                    <Option value="POST">POST</Option>
                                                    <Option value="PUT">PUT</Option>
                                                    <Option value="DELETE">DELETE</Option>
                                                    <Option value="PATCH">PATCH</Option>
                                                    <Option value="HEAD">HEAD</Option>
                                                    <Option value="OPTIONS">OPTIONS</Option>
                                                </Select>
                                            </Form.Item>

                                            <Form.Item
                                                {...restField}
                                                name={[name, 'match', 'status']}
                                                label="响应状态码"
                                                tooltip="要匹配的 HTTP 状态码，例如: 200, 404（为0时匹配所有状态码）"
                                            >
                                                <InputNumber
                                                    min={0}
                                                    max={599}
                                                    placeholder="200"
                                                    style={{width: '100%'}}
                                                />
                                            </Form.Item>
                                        </Card>
                                    </Col>

                                    <Col span={12}>
                                        <Card title="修改动作" size="small">
                                            <Divider orientation="left" style={{margin: '12px 0'}}>
                                                <Text strong>头部操作</Text>
                                            </Divider>

                                            {renderKeyValueFields(
                                                [name, 'actions', 'set_headers'],
                                                'Set Headers',
                                                '设置或覆盖响应头部'
                                            )}

                                            {renderKeyValueFields(
                                                [name, 'actions', 'add_headers'],
                                                'Add Headers',
                                                '添加响应头部（如果不存在）'
                                            )}

                                            <Form.List name={[name, 'actions', 'remove_headers']}>
                                                {(fields, {add, remove}) => (
                                                    <>
                                                        <Row align="middle" style={{marginBottom: 8}}>
                                                            <Col>
                                                                <Text strong>Remove Headers</Text>
                                                                <Tooltip
                                                                    title="要移除的响应头部（只需要指定头部名称）">
                                                                    <QuestionCircleOutlined style={{
                                                                        marginLeft: 8,
                                                                        cursor: 'pointer'
                                                                    }}/>
                                                                </Tooltip>
                                                            </Col>
                                                        </Row>
                                                        {fields.map(({key, name: subName, ...restField}) => (
                                                            <Row gutter={8} key={key} style={{marginBottom: 8}}>
                                                                <Col flex="1">
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[subName]}
                                                                        rules={[{
                                                                            required: true,
                                                                            message: '请输入头部名称'
                                                                        }]}
                                                                        style={{marginBottom: 0}}
                                                                    >
                                                                        <Input placeholder="要移除的头部名称"/>
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col>
                                                                    <MinusCircleOutlined
                                                                        onClick={() => remove(subName)}
                                                                        style={{
                                                                            color: '#ff4d4f',
                                                                            fontSize: '16px'
                                                                        }}
                                                                    />
                                                                </Col>
                                                            </Row>
                                                        ))}
                                                        <Form.Item>
                                                            <Button
                                                                type="dashed"
                                                                onClick={() => add()}
                                                                block
                                                                icon={<PlusOutlined/>}
                                                                style={{marginTop: 8}}
                                                            >
                                                                添加要移除的头部
                                                            </Button>
                                                        </Form.Item>
                                                    </>
                                                )}
                                            </Form.List>

                                            <Divider orientation="left" style={{margin: '12px 0'}}>
                                                <Text strong>响应体替换</Text>
                                            </Divider>

                                            <Form.List name={[name, 'actions', 'body_replace']}>
                                                {(fields, {add, remove}) => (
                                                    <>
                                                        {fields.map(({key, name: subName, ...restField}) => (
                                                            <Card
                                                                key={key}
                                                                size="small"
                                                                title={`替换规则 ${subName + 1}`}
                                                                extra={
                                                                    <MinusCircleOutlined
                                                                        onClick={() => remove(subName)}
                                                                        style={{color: '#ff4d4f'}}
                                                                    />
                                                                }
                                                                style={{marginBottom: 12}}
                                                            >
                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[subName, 'search']}
                                                                    label="搜索文本"
                                                                    rules={[{
                                                                        required: true,
                                                                        message: '请输入搜索文本'
                                                                    }]}
                                                                >
                                                                    <Input placeholder="要搜索的文本"/>
                                                                </Form.Item>

                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[subName, 'is_regex']}
                                                                    label="使用正则表达式"
                                                                    valuePropName="checked"
                                                                    tooltip="是否将搜索文本视为正则表达式"
                                                                >
                                                                    <Switch/>
                                                                </Form.Item>

                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[subName, 'replace']}
                                                                    label="替换文本"
                                                                    rules={[{
                                                                        required: true,
                                                                        message: '请输入替换文本'
                                                                    }]}
                                                                >
                                                                    <Input placeholder="替换为此文本"/>
                                                                </Form.Item>
                                                            </Card>
                                                        ))}
                                                        <Form.Item>
                                                            <Button
                                                                type="dashed"
                                                                onClick={() => add()}
                                                                block
                                                                icon={<PlusOutlined/>}
                                                            >
                                                                添加替换规则
                                                            </Button>
                                                        </Form.Item>
                                                    </>
                                                )}
                                            </Form.List>
                                        </Card>
                                    </Col>
                                </Row>
                            </Card>
                        ))}
                        <Form.Item>
                            <Button
                                type="dashed"
                                onClick={() => add()}
                                block
                                icon={<PlusOutlined/>}
                                size="large"
                            >
                                添加修改规则
                            </Button>
                        </Form.Item>
                    </>
                )}
            </Form.List>
        </div>
    );
};

export default WebsiteModifyResponseView;
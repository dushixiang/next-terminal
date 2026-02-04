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
import {useTranslation} from "react-i18next";

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
    const {t} = useTranslation();
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

            console.log('Submitted payload:', JSON.stringify(payload, null, 2));

            // 这里应该调用您的 API
            // await saveModifyRules(payload);

            notification.success({
                message: t('assets.website_response_modify.save_success'),
                description: t('assets.website_response_modify.save_success_desc'),
                placement: 'topRight',
            });
        } catch (error) {
            message.error(t('assets.website_response_modify.save_failed'));
            console.error('Save failed:', error);
        } finally {
            setLoading(false);
        }
    };

    // 渲染键值对字段
    const renderKeyValueFields = (fieldName: any[], label: string, tooltip: string, addLabel: string) => (
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
                                    rules={[{required: true, message: t('assets.website_response_modify.header_key_required')}]}
                                    style={{marginBottom: 0}}
                                >
                                    <Input placeholder={t('assets.header_key')}/>
                                </Form.Item>
                            </Col>
                            <Col flex="1">
                                <Form.Item
                                    {...restField}
                                    name={[name, 'value']}
                                    rules={[{required: true, message: t('assets.website_response_modify.header_value_required')}]}
                                    style={{marginBottom: 0}}
                                >
                                    <Input placeholder={t('assets.header_value')}/>
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
                            {addLabel}
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
                                        rules={[{required: true, message: t('assets.website_response_modify.rule_name_required')}]}
                                        style={{marginBottom: 0}}
                                    >
                                        <Input placeholder={t('assets.website_response_modify.rule_name_placeholder')}/>
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
                                        <Card title={t('assets.website_response_modify.match_conditions')} size="small" style={{marginBottom: 16}}>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'match', 'path']}
                                                label={t('assets.website_response_modify.match_path')}
                                                tooltip={t('assets.website_response_modify.match_path_tip')}
                                            >
                                                <Input placeholder="/hello"/>
                                            </Form.Item>

                                            <Form.Item
                                                {...restField}
                                                name={[name, 'match', 'method']}
                                                label={t('assets.website_response_modify.match_method')}
                                                tooltip={t('assets.website_response_modify.match_method_tip')}
                                            >
                                                <Select placeholder={t('assets.website_response_modify.match_method_placeholder')} allowClear>
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
                                                label={t('assets.website_response_modify.match_status')}
                                                tooltip={t('assets.website_response_modify.match_status_tip')}
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
                                        <Card title={t('assets.website_response_modify.actions_title')} size="small">
                                            <Divider orientation="left" style={{margin: '12px 0'}}>
                                                <Text strong>{t('assets.website_response_modify.header_operations')}</Text>
                                            </Divider>

                                            {renderKeyValueFields(
                                                [name, 'actions', 'set_headers'],
                                                t('assets.website_response_modify.set_headers_label'),
                                                t('assets.website_response_modify.set_headers_tip'),
                                                t('assets.website_response_modify.add_set_headers')
                                            )}

                                            {renderKeyValueFields(
                                                [name, 'actions', 'add_headers'],
                                                t('assets.website_response_modify.add_headers_label'),
                                                t('assets.website_response_modify.add_headers_tip'),
                                                t('assets.website_response_modify.add_add_headers')
                                            )}

                                            <Form.List name={[name, 'actions', 'remove_headers']}>
                                                {(fields, {add, remove}) => (
                                                    <>
                                                        <Row align="middle" style={{marginBottom: 8}}>
                                                            <Col>
                                                                <Text strong>{t('assets.website_response_modify.remove_headers_label')}</Text>
                                                                <Tooltip
                                                                    title={t('assets.website_response_modify.remove_headers_tip')}>
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
                                                                            message: t('assets.website_response_modify.remove_header_name_required')
                                                                        }]}
                                                                        style={{marginBottom: 0}}
                                                                    >
                                                                        <Input placeholder={t('assets.website_response_modify.remove_header_name_placeholder')}/>
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
                                                                {t('assets.website_response_modify.add_remove_header_button')}
                                                            </Button>
                                                        </Form.Item>
                                                    </>
                                                )}
                                            </Form.List>

                                            <Divider orientation="left" style={{margin: '12px 0'}}>
                                                <Text strong>{t('assets.website_response_modify.body_replace_title')}</Text>
                                            </Divider>

                                            <Form.List name={[name, 'actions', 'body_replace']}>
                                                {(fields, {add, remove}) => (
                                                    <>
                                                        {fields.map(({key, name: subName, ...restField}) => (
                                                            <Card
                                                                key={key}
                                                                size="small"
                                                                title={t('assets.website_response_modify.replace_rule_title', {index: subName + 1})}
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
                                                                        label={t('assets.website_response_modify.search_text_label')}
                                                                        rules={[{
                                                                            required: true,
                                                                            message: t('assets.website_response_modify.search_text_required')
                                                                        }]}
                                                                    >
                                                                        <Input placeholder={t('assets.website_response_modify.search_text_placeholder')}/>
                                                                    </Form.Item>

                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[subName, 'is_regex']}
                                                                    label={t('assets.website_response_modify.use_regex_label')}
                                                                    valuePropName="checked"
                                                                    tooltip={t('assets.website_response_modify.use_regex_tip')}
                                                                >
                                                                    <Switch/>
                                                                </Form.Item>

                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[subName, 'replace']}
                                                                    label={t('assets.website_response_modify.replace_text_label')}
                                                                    rules={[{
                                                                        required: true,
                                                                        message: t('assets.website_response_modify.replace_text_required')
                                                                    }]}
                                                                >
                                                                    <Input placeholder={t('assets.website_response_modify.replace_text_placeholder')}/>
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
                                                                {t('assets.website_response_modify.add_replace_rule')}
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
                            {t('assets.website_response_modify.add_modify_rule')}
                        </Button>
                    </Form.Item>
                    </>
                )}
            </Form.List>
        </div>
    );
};

export default WebsiteModifyResponseView;

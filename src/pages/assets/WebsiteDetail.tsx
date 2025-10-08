import React, {useState, useEffect} from 'react';
import {useParams, useSearchParams} from "react-router-dom";
import {Tabs, Card, Descriptions, Tag, Switch, App} from "antd";
import {maybe} from "@/src/utils/maybe";
import websiteApi, {Website} from "@/src/api/website-api";
import {LinkOutlined} from "@ant-design/icons";
import dayjs from "dayjs";

const WebsiteDetail = () => {
    let params = useParams();
    const id = params['websiteId'] as string;
    const [searchParams, setSearchParams] = useSearchParams();
    let key = maybe(searchParams.get('activeKey'), "info");
    const {message} = App.useApp();

    let [activeKey, setActiveKey] = useState(key);
    const [website, setWebsite] = useState<Website | null>(null);
    const [loading, setLoading] = useState(true);

    const handleTagChange = (key: string) => {
        setActiveKey(key);
        setSearchParams({'activeKey': key});
    }

    const fetchWebsiteDetail = async () => {
        try {
            setLoading(true);
            const data = await websiteApi.getById(id);
            setWebsite(data);
        } catch (error) {
            message.error('获取网站详情失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchWebsiteDetail();
        }
    }, [id]);

    const handleStatusToggle = async (checked: boolean) => {
        if (!website) return;
        
        try {
            const updatedWebsite = {...website, enabled: checked};
            await websiteApi.updateById(website.id, updatedWebsite);
            setWebsite(updatedWebsite);
            message.success(checked ? '网站已启用' : '网站已禁用');
        } catch (error) {
            message.error('状态更新失败');
        }
    };

    const renderBasicInfo = () => (
        <Card title="基本信息" loading={loading}>
            {website && (
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="网站名称">{website.name}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                        <Switch 
                            checked={website.enabled} 
                            onChange={handleStatusToggle}
                            checkedChildren="启用" 
                            unCheckedChildren="禁用" 
                        />
                        <Tag color={website.enabled ? 'green' : 'red'} style={{marginLeft: 8}}>
                            {website.enabled ? '启用' : '禁用'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="目标地址">
                        <a href={website.targetUrl} target="_blank" rel="noopener noreferrer">
                            {website.targetUrl} <LinkOutlined />
                        </a>
                    </Descriptions.Item>
                    <Descriptions.Item label="域名">{website.domain}</Descriptions.Item>
                    <Descriptions.Item label="入口">{website.entrance || '-'}</Descriptions.Item>
                    <Descriptions.Item label="目标主机">{website.targetHost}</Descriptions.Item>
                    <Descriptions.Item label="目标端口">{website.targetPort}</Descriptions.Item>
                    <Descriptions.Item label="代理网关ID">{website.agentGatewayId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="描述" span={2}>{website.description || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间" span={2}>
                        {dayjs(website.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                </Descriptions>
            )}
        </Card>
    );

    const renderSecurityInfo = () => (
        <Card title="安全配置" loading={loading}>
            {website && (
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="基本认证">
                        <Tag color={website.basicAuth?.enabled ? 'green' : 'red'}>
                            {website.basicAuth?.enabled ? '已启用' : '未启用'}
                        </Tag>
                        {website.basicAuth?.enabled && (
                            <div style={{marginTop: 8}}>
                                <div>用户名: {website.basicAuth.username}</div>
                                <div>密码: ****</div>
                            </div>
                        )}
                    </Descriptions.Item>
                    <Descriptions.Item label="SSL证书">
                        <Tag color={website.cert?.enabled ? 'green' : 'red'}>
                            {website.cert?.enabled ? '已启用' : '未启用'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="公共访问">
                        <Tag color={website.public?.enabled ? 'green' : 'red'}>
                            {website.public?.enabled ? '已启用' : '未启用'}
                        </Tag>
                        {website.public?.enabled && (
                            <div style={{marginTop: 8}}>
                                <div>IP限制: {website.public.ip || '无限制'}</div>
                                <div>过期时间: {website.public.expiredAt ? dayjs(website.public.expiredAt).format('YYYY-MM-DD HH:mm:ss') : '永久有效'}</div>
                                <div>临时口令: {website.public.password ? '已设置' : '未设置'}</div>
                            </div>
                        )}
                    </Descriptions.Item>
                </Descriptions>
            )}
        </Card>
    );

    const renderHeaders = () => (
        <Card title="请求头配置" loading={loading}>
            {website && website.headers && website.headers.length > 0 ? (
                <Descriptions column={1} bordered>
                    {website.headers.map((header: any, index: number) => (
                        <Descriptions.Item key={index} label={header.name}>
                            {header.value}
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            ) : (
                <div style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                    暂无请求头配置
                </div>
            )}
        </Card>
    );

    const items = [
        {
            key: 'info',
            label: '基本信息',
            children: renderBasicInfo(),
        },
        {
            key: 'security',
            label: '安全配置',
            children: renderSecurityInfo(),
        },
        {
            key: 'headers',
            label: '请求头',
            children: renderHeaders(),
        },
    ];

    return (
        <div className={'px-4'}>
            <Tabs 
                activeKey={activeKey}
                onChange={handleTagChange}
                items={items}
            />
        </div>
    );
};

export default WebsiteDetail;
import React, {useEffect, useState} from 'react';
import {Alert, Button, Card, Descriptions, message, Space} from "antd";
import {useTranslation} from "react-i18next";
import {Download, Info, MapPin} from 'lucide-react';
import requests from '@/api/core/requests';
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {renderSize} from "@/utils/utils";
import dayjs from "dayjs";

interface GeoIPFileInfo {
    exists: boolean;
    size: number;
    modTime: string;
    hash: string;
    path: string;
}

const GeoIPSetting = () => {
    const {t} = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();
    const [fileInfo, setFileInfo] = useState<GeoIPFileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const { license } = useLicense();

    // 获取 GeoIP 文件信息
    const fetchFileInfo = async () => {
        setLoading(true);
        try {
            const response = await requests.get('/admin/geoip/info');
            // 只有当文件存在时才设置文件信息
            if (response.exists) {
                setFileInfo(response);
            } else {
                setFileInfo(null);
            }
        } catch (error) {
            console.error('获取文件信息失败:', error);
            messageApi.error('获取文件信息失败');
            setFileInfo(null);
        } finally {
            setLoading(false);
        }
    };

    // 确保 GeoIP 文件存在
    const handleEnsureFile = async () => {
        setUpdating(true);
        try {
            const response = await requests.post('/admin/geoip/ensure');
            messageApi.success('GeoIP 文件检查完成');
            await fetchFileInfo(); // 刷新文件信息
        } catch (error) {
            console.error('文件检查失败:', error);
            messageApi.error('文件检查失败');
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        fetchFileInfo();
    }, []);

    return (
        <div>
            <Disabled disabled={license.isFree()}>
                <Alert
                    message="GeoIP 地理位置服务是专业版功能，用于提供精确的 IP 地址地理位置信息。"
                    type="info"
                    showIcon
                    style={{marginBottom: 16}}
                />
                <Card
                    title={
                        <Space>
                            <MapPin size={20}/>
                            <span>GeoIP 数据库管理</span>
                        </Space>
                    }
                    loading={loading}
                >
                    {fileInfo ? (
                        <Descriptions column={1} bordered>
                            <Descriptions.Item label="文件路径">
                                <code>{fileInfo.path}</code>
                            </Descriptions.Item>
                            <Descriptions.Item label="文件大小">
                                {renderSize(fileInfo.size)}
                            </Descriptions.Item>
                            <Descriptions.Item label="修改时间">
                                {dayjs(fileInfo.modTime).format('YYYY-MM-DD HH:mm:ss')}
                            </Descriptions.Item>
                            <Descriptions.Item label="文件哈希">
                                <code style={{fontSize: '12px', wordBreak: 'break-all'}}>
                                    {fileInfo.hash}
                                </code>
                            </Descriptions.Item>
                        </Descriptions>
                    ) : (
                        <Alert
                            message="GeoIP 数据库文件不存在"
                            description="请点击下方按钮下载 GeoIP 数据库文件"
                            type="warning"
                            showIcon
                        />
                    )}

                    <div style={{marginTop: 16}}>
                        <Space>
                            <Button
                                type="primary"
                                icon={<Download size={16}/>}
                                loading={updating}
                                onClick={handleEnsureFile}
                            >
                                检查并下载
                            </Button>
                            <Button
                                icon={<Info size={16}/>}
                                onClick={fetchFileInfo}
                                disabled={loading}
                            >
                                刷新信息
                            </Button>
                        </Space>
                    </div>

                    <Alert
                        message="使用说明"
                        description={
                            <ul style={{margin: 0, paddingLeft: 20}}>
                                <li>检查并下载：检查文件是否存在，如不存在则自动下载，存在则检查文件哈希是否一致，不一致则重新下载。</li>
                                <li>刷新信息：重新获取当前文件的详细信息。</li>
                            </ul>
                        }
                        type="info"
                        style={{marginTop: 16}}
                    />
                </Card>
            </Disabled>
            {contextHolder}
        </div>
    );
};

export default GeoIPSetting;
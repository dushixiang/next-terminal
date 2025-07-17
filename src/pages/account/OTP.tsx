import React, {useEffect, useState} from 'react';
import {Typography, Card, Row, Col, Steps, Alert, Divider, List, Tag, Space} from "antd";
import {
    SafetyOutlined, 
    MobileOutlined, 
    ClockCircleOutlined, 
    GlobalOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import accountApi from "../../api/account-api";
import {useQuery} from "@tanstack/react-query";
import OTPBinding from "./OTPBinding";
import OTPUnBinding from "./OTPUnBinding";
import {useTranslation} from "react-i18next";

const {Title, Paragraph, Text} = Typography;

const OTP = () => {

    let {t} = useTranslation();
    let infoQuery = useQuery({
        queryKey: ['info'],
        queryFn: accountApi.getUserInfo,
    })

    let [view, setView] = useState<string>('binding');

    useEffect(() => {
        if (infoQuery.data?.enabledTotp) {
            setView('unbinding');
        }else {
            setView('binding');
        }
    }, [infoQuery.data]);

    const refetch = () => {
        infoQuery.refetch();
    }

    const renderFeatures = () => {
        const features = [
            {
                icon: <SafetyOutlined style={{color: '#52c41a'}} />,
                title: t('account.otp_features.enhanced_security'),
            },
            {
                icon: <MobileOutlined style={{color: '#1890ff'}} />,
                title: t('account.otp_features.offline_access'),
            },
            {
                icon: <ClockCircleOutlined style={{color: '#faad14'}} />,
                title: t('account.otp_features.time_based'),
            },
            {
                icon: <GlobalOutlined style={{color: '#722ed1'}} />,
                title: t('account.otp_features.widely_supported'),
            }
        ];

        return (
            <List
                dataSource={features}
                renderItem={(item) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={item.icon}
                            title={item.title}
                        />
                    </List.Item>
                )}
            />
        );
    };

    const renderAuthApps = () => {
        const apps = [
            { name: t('account.otp_apps.google_authenticator'), color: 'blue' },
            { name: t('account.otp_apps.microsoft_authenticator'), color: 'green' },
            { name: t('account.otp_apps.authy'), color: 'orange' },
            { name: t('account.otp_apps.1password'), color: 'purple' },
            { name: t('account.otp_apps.lastpass'), color: 'red' },
        ];

        return (
            <Space wrap>
                {apps.map((app, index) => (
                    <Tag key={index} color={app.color} style={{margin: '4px'}}>
                        {app.name}
                    </Tag>
                ))}
            </Space>
        );
    };

    const renderSetupGuide = () => {
        const steps = [
            {
                title: t('account.otp_setup_guide.step1.title'),
                description: (
                    <div>
                        <Paragraph>{t('account.otp_setup_guide.step1.description')}</Paragraph>
                        {renderAuthApps()}
                    </div>
                ),
                icon: <MobileOutlined />,
            },
            {
                title: t('account.otp_setup_guide.step2.title'),
                description: t('account.otp_setup_guide.step2.description'),
                icon: <InfoCircleOutlined />,
            },
            {
                title: t('account.otp_setup_guide.step3.title'),
                description: t('account.otp_setup_guide.step3.description'),
                icon: <CheckCircleOutlined />,
            }
        ];

        return (
            <Steps
                direction="vertical"
                current={-1}
                items={steps}
                style={{marginTop: 16}}
            />
        );
    };

    const renderView = (view: string) => {
        switch (view) {
            case 'unbinding':
                return <OTPUnBinding refetch={refetch}/>;
            case 'binding':
                return (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={10}>
                            <Card 
                                title={
                                    <Space>
                                        <InfoCircleOutlined />
                                        {t('account.otp_features.title')}
                                    </Space>
                                }
                                size="small"
                            >
                                {renderFeatures()}
                            </Card>
                            
                            <Card 
                                title={t('account.otp_setup_guide.title')} 
                                style={{marginTop: 16}}
                                size="small"
                            >
                                {renderSetupGuide()}
                            </Card>
                        </Col>
                        
                        <Col xs={24} lg={14}>
                            <Card 
                                title={
                                    <Space>
                                        <SafetyOutlined />
                                        {t('account.otp_binding_title')}
                                    </Space>
                                }
                                size="small"
                            >
                                <OTPBinding refetch={refetch}/>
                            </Card>
                        </Col>
                    </Row>
                );
        }
    }

    return (
        <div style={{padding: '0 24px'}}>
            <Title level={3} style={{marginTop: 0, marginBottom: 16}}>
                <Space>
                    <SafetyOutlined />
                    {t('account.otp')}
                </Space>
            </Title>
            
            <Alert
                message={t('account.otp_description')}
                type="info"
                showIcon
                style={{marginBottom: 24}}
            />

            {renderView(view)}
        </div>
    );
};

export default OTP;
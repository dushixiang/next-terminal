import React, {useState} from 'react';
import {Button, Form, Image, Input, message, Modal, Result, Space, Typography} from "antd";
import {ExclamationCircleOutlined, ReloadOutlined} from "@ant-design/icons";
import accountApi from "../api/account";
import {useQuery} from "react-query";

const {Title} = Typography;

const Totp = () => {

    let infoQuery = useQuery('infoQuery', accountApi.getUserInfo);
    let [totp, setTotp] = useState({});

    const resetTOTP = async () => {
        let totp = await accountApi.reloadTotp();
        setTotp(totp);
    }

    const confirmTOTP = async (values) => {
        values['secret'] = totp['secret'];
        let success = await accountApi.confirmTotp(values);
        if (success) {
            message.success('TOTP启用成功');
            await infoQuery.refetch();
            setTotp({});
        }
    }

    const renderBindingTotpPage = (qr) => {
        if (!qr) {
            return undefined;
        }
        return <Form hidden={!totp.qr} onFinish={confirmTOTP}>
            <Form.Item label="二维码"
                       extra={'有效期30秒，在扫描后请尽快输入。推荐使用Google Authenticator, Authy 或者 Microsoft Authenticator。'}>
                <Space size={12} direction='horizontal'>
                    <Image
                        style={{padding: 20}}
                        width={280}
                        src={"data:image/png;base64, " + totp.qr}
                    />
                    <Button
                        type="primary"
                        icon={<ReloadOutlined/>}
                        onClick={resetTOTP}
                    >
                        重新加载
                    </Button>
                </Space>
            </Form.Item>
            <Form.Item
                name="totp"
                label="TOTP"
                rules={[
                    {
                        required: true,
                        message: '请输入双因素认证APP中显示的授权码',
                    },
                ]}
            >
                <Input placeholder="请输入双因素认证APP中显示的授权码"/>
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit">
                    确认
                </Button>
            </Form.Item>
        </Form>
    }

    return (
        <div>
            <Title level={4}>双因素认证</Title>
            <Form hidden={totp.qr}>
                <Form.Item>
                    {
                        infoQuery.data?.enableTotp ?
                            <Result
                                status="success"
                                title="您已成功开启双因素认证!"
                                subTitle="多因素认证-MFA二次认证-登录身份鉴别,访问控制更安全。"
                                extra={[
                                    <Button type="primary" key="console" danger onClick={() => {
                                        Modal.confirm({
                                            title: '您确认要解除双因素认证吗？',
                                            icon: <ExclamationCircleOutlined/>,
                                            content: '解除之后可能存在系统账号被暴力破解的风险。',
                                            okText: '确认',
                                            okType: 'danger',
                                            cancelText: '取消',
                                            onOk: async () => {
                                                let success = await accountApi.resetTotp();
                                                if (success) {
                                                    message.success('双因素认证解除成功');
                                                    await infoQuery.refetch();
                                                }
                                            },
                                            onCancel() {
                                                console.log('Cancel');
                                            },
                                        })
                                    }}>
                                        解除绑定
                                    </Button>,
                                    <Button key="re-bind" onClick={resetTOTP}>重新绑定</Button>,
                                ]}
                            /> :
                            <Result
                                status="warning"
                                title="您还未开启双因素认证！"
                                subTitle="系统账号存在被暴力破解的风险。"
                                extra={
                                    <Button type="primary" key="bind" onClick={resetTOTP}>
                                        去开启
                                    </Button>
                                }
                            />
                    }

                </Form.Item>
            </Form>

            {
                renderBindingTotpPage(totp.qr)
            }

        </div>
    );
};

export default Totp;
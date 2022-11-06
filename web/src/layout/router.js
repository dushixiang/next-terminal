import {
    ApiOutlined,
    AuditOutlined,
    BlockOutlined,
    CloudServerOutlined,
    CodeOutlined,
    ControlOutlined,
    DashboardOutlined,
    DesktopOutlined,
    DisconnectOutlined,
    HddOutlined,
    IdcardOutlined,
    InsuranceOutlined,
    LinkOutlined,
    LoginOutlined,
    MonitorOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
    SolutionOutlined,
    TeamOutlined,
    UserOutlined,
    UserSwitchOutlined,
} from "@ant-design/icons";
import React from "react";

export const routers = [
    {
        key: 'dashboard',
        label: '控制面板',
        icon: <DashboardOutlined/>,
    },
    {
        key: 'resource',
        label: '资源管理',
        icon: <CloudServerOutlined/>,
        children: [
            {
                key: 'asset',
                label: '资产管理',
                icon: <DesktopOutlined/>,
            },
            {
                key: 'credential',
                label: '授权凭证',
                icon: <IdcardOutlined/>,
            },
            {
                key: 'command',
                label: '动态指令',
                icon: <CodeOutlined/>,
            },
            {
                key: 'access-gateway',
                label: '接入网关',
                icon: <ApiOutlined/>,
            },
        ]
    },
    {
        key: 'session-audit',
        label: '会话审计',
        icon: <AuditOutlined/>,
        children: [
            {
                key: 'online-session',
                label: '在线会话',
                icon: <LinkOutlined/>,
            },
            {
                key: 'offline-session',
                label: '历史会话',
                icon: <DisconnectOutlined/>,
            },
        ]
    },
    {
        key: 'log-audit',
        label: '日志审计',
        icon: <AuditOutlined/>,
        children: [
            {
                key: 'login-log',
                label: '登录日志',
                icon: <LoginOutlined/>,
            },
        ]
    },
    {
        key: 'ops',
        label: '系统运维',
        icon: <ControlOutlined/>,
        children: [
            {
                key: 'job',
                label: '计划任务',
                icon: <BlockOutlined/>,
            },
            {
                key: 'storage',
                label: '磁盘空间',
                icon: <HddOutlined/>,
            },
            {
                key: 'monitoring',
                label: '系统监控',
                icon: <MonitorOutlined/>,
            },
        ]
    },
    {
        key: 'security',
        label: '安全策略',
        icon: <SafetyCertificateOutlined/>,
        children: [
            {
                key: 'access-security',
                label: '访问安全',
                icon: <SafetyCertificateOutlined/>,
            },
            {
                key: 'login-policy',
                label: '登录策略',
                icon: <LoginOutlined/>,
            },
        ]
    },
    {
        key: 'identity',
        label: '用户管理',
        icon: <UserSwitchOutlined/>,
        children: [
            {
                key: 'user',
                label: '用户管理',
                icon: <UserOutlined/>,
            },
            {
                key: 'role',
                label: '角色管理',
                icon: <SolutionOutlined/>,
            },
            {
                key: 'user-group',
                label: '用户组管理',
                icon: <TeamOutlined/>,
            },
        ]
    },
    {
        key: 'authorised',
        label: '授权策略',
        icon: <UserSwitchOutlined/>,
        children: [
            {
                key: 'strategy',
                label: '授权策略',
                icon: <InsuranceOutlined/>,
            },
        ]
    },
    {
        key: 'setting',
        label: '系统设置',
        icon: <SettingOutlined/>,
    },
    {
        key: 'info',
        label: '个人中心',
        icon: <UserOutlined />,
    },
]
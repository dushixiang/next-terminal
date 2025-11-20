import '@/beautiful-scrollbar.css';
import '@/App.css';
import React, {lazy, useEffect} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import '@/react-i18next/i18n'
import ManagerLayout from '@/layout/ManagerLayout';
import AccessPage from "@/pages/access/AccessPage";
import eventEmitter from "@/api/core/event-emitter";
import {baseUrl} from "@/api/core/requests";
import {useTranslation} from "react-i18next";
import {message} from "antd";

import TerminalPage from "@/pages/access/TerminalPage";
import GuacamolePage from "@/pages/access/GuacamolePage";

const AuthorisedAssetPage = lazy(() => import("@/pages/authorised/AuthorisedAssetPage"));
const AuthorisedWebsitePage = lazy(() => import("@/pages/authorised/AuthorisedWebsitePage"));
const AuthorisedAssetPost = lazy(() => import("@/pages/authorised/AuthorisedAssetPost"));
const AuthorisedWebsitePost = lazy(() => import("@/pages/authorised/AuthorisedWebsitePost"));
const LoginPage = lazy(() => import("@/pages/account/LoginPage"));
const WechatWorkCallback = lazy(() => import("@/pages/account/WechatWorkCallback"));
const OidcCallback = lazy(() => import("@/pages/account/OidcCallback"));
const MobileAccessTerminal = lazy(() => import("@/pages/access/MobileAccessTerminal"));
const UserPage = lazy(() => import("@/pages/identity/UserPage"));
const UserDetailPage = lazy(() => import("@/pages/identity/UserDetailPage"));
const SettingPage = lazy(() => import("@/pages/sysconf/SettingPage"));
const InfoPage = lazy(() => import("@/pages/account/InfoPage"));
const DepartmentPage = lazy(() => import("@/pages/identity/DepartmentPage"));
const DepartmentDetail = lazy(() => import("@/pages/identity/DepartmentDetail"));
const RolePage = lazy(() => import("@/pages/identity/RolePage"));
const RoleDetail = lazy(() => import("@/pages/identity/RoleDetail"));
const LoginLockedPage = lazy(() => import("@/pages/identity/LoginLockedPage"));
const LoginPolicyPage = lazy(() => import("@/pages/identity/LoginPolicyPage"));
const LoginPolicyPostPage = lazy(() => import("@/pages/identity/LoginPolicyPostPage"));
const LoginPolicyDetailPage = lazy(() => import("@/pages/identity/LoginPolicyDetailPage"));
const AssetsPage = lazy(() => import("@/pages/assets/AssetPage"));
const CredentialPage = lazy(() => import("@/pages/assets/CredentialPage"));
const CertificatePage = lazy(() => import("@/pages/assets/CertificatePage"));
const SnippetPage = lazy(() => import("@/pages/assets/SnippetPage"));
const StrategyPage = lazy(() => import("@/pages/authorised/StrategyPage"));
const CommandFilterPage = lazy(() => import("@/pages/authorised/CommandFilterPage"));
const CommandFilterDetail = lazy(() => import("@/pages/authorised/CommandFilterDetail"));
const ScheduledTaskPage = lazy(() => import("@/pages/sysops/ScheduledTaskPage"));
const ToolsPage = lazy(() => import("@/pages/sysops/ToolsPage"));
const LoginLogPage = lazy(() => import("@/pages/audit/LoginLogPage"));
const OperationLogPage = lazy(() => import("@/pages/audit/OperationLogPage"));
const OfflineSessionPage = lazy(() => import("@/pages/audit/OfflineSessionPage"));
const OnlineSessionPage = lazy(() => import("@/pages/audit/OnlineSessionPage"));
const TerminalPlayback = lazy(() => import("@/pages/access/TerminalPlayback"));
const TerminalMonitor = lazy(() => import("@/pages/access/TerminalMonitor"));
const GuacdPlayback = lazy(() => import("@/pages/access/GuacdPlayback"));
const GuacdMonitor = lazy(() => import("@/pages/access/GuacdMonitor"));
const FileSystemLogPage = lazy(() => import("@/pages/audit/FileSystemLogPage"));
const AccessLogPage = lazy(() => import("@/pages/audit/AccessLogPage"));
const AccessLogStatsPage = lazy(() => import("@/pages/audit/AccessLogStatsPage"));
const SshGatewayPage = lazy(() => import("@/pages/gateway/SshGatewayPage"));
const AgentGatewayPage = lazy(() => import("@/pages/gateway/AgentGatewayPage"));
const ErrorPage = lazy(() => import("@/components/ErrorPage"));
const StoragePage = lazy(() => import("@/pages/assets/StoragePage"));
const WebsitePage = lazy(() => import("@/pages/assets/WebsitePage"));
const BrowserPage = lazy(() => import("@/pages/access/BrowserPage"));
const FacadePage = lazy(() => import("@/pages/facade/FacadePage"));
const WebsiteFacadePage = lazy(() => import("@/pages/facade/WebsiteFacadePage"));
const RedirectPage = lazy(() => import("@/layout/RedirectPage"));
const UserLayout = lazy(() => import("@/layout/UserLayout"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const UserInfoPage = lazy(() => import("@/pages/facade/UserInfoPage"));
const SnippetUserPage = lazy(() => import("@/pages/facade/SnippetUserPage"));
const SystemMonitorPage = lazy(() => import("@/pages/sysops/SystemMonitorPage"));
const SetupPage = lazy(() => import("@/pages/identity/SetupPage"));

const router = createBrowserRouter([
    {path: "/setup", element: <SetupPage/>},
    {path: "/access", element: <AccessPage/>},
    {path: "/login", element: <LoginPage/>},
    {path: "/wechat-work/callback", element: <WechatWorkCallback/>},
    {path: "/oidc/callback", element: <OidcCallback/>},
    {path: "/terminal-playback", element: <TerminalPlayback/>},
    {path: "/terminal-monitor", element: <TerminalMonitor/>},
    {path: "/graphics-playback", element: <GuacdPlayback/>},
    {path: "/graphics-monitor", element: <GuacdMonitor/>},
    {path: "/terminal", element: <TerminalPage/>,},
    {path: "/mobile-terminal", element: <MobileAccessTerminal/>,},
    {path: "/graphics", element: <GuacamolePage/>,},
    {path: "/browser", element: <BrowserPage/>,},
    {path: "/", element: <RedirectPage/>, errorElement: <ErrorPage/>,},
    {
        element: <UserLayout/>,
        children: [
            {path: "/x-asset", element: <FacadePage/>,},
            {path: "/x-website", element: <WebsiteFacadePage/>,},
            {path: "/x-snippet", element: <SnippetUserPage/>,},
            {path: "/x-info", element: <UserInfoPage/>,},
        ]
    },
    {
        element: <ManagerLayout/>,
        children: [
            {path: "/dashboard", element: <DashboardPage/>},
            {path: "/user", element: <UserPage/>},
            {path: "/user/:userId", element: <UserDetailPage/>},
            {path: "/department", element: <DepartmentPage/>},
            {path: "/department/:departmentId", element: <DepartmentDetail/>},
            {path: "/login-locked", element: <LoginLockedPage/>},
            {path: "/login-policy", element: <LoginPolicyPage/>},
            {path: "/login-policy/new", element: <LoginPolicyPostPage/>},
            {path: "/login-policy/:loginPolicyId", element: <LoginPolicyDetailPage/>},
            {path: "/role", element: <RolePage/>},
            {path: "/role/:roleId", element: <RoleDetail/>},
            {path: "/login-log", element: <LoginLogPage/>},
            {path: "/operation-log", element: <OperationLogPage/>},

            {path: "/asset", element: <AssetsPage/>},
            {path: "/credential", element: <CredentialPage/>},
            {path: "/snippet", element: <SnippetPage/>},
            {path: "/storage", element: <StoragePage/>},
            {path: "/website", element: <WebsitePage/>},
            {path: "/certificate", element: <CertificatePage/>},

            {path: "/strategy", element: <StrategyPage/>},
            {path: "/command-filter", element: <CommandFilterPage/>},
            {path: "/command-filter/:commandFilterId", element: <CommandFilterDetail/>},
            {path: "/authorised-asset", element: <AuthorisedAssetPage/>},
            {path: "/authorised-asset/post", element: <AuthorisedAssetPost/>},
            {path: "/authorised-website", element: <AuthorisedWebsitePage/>},
            {path: "/authorised-website/post", element: <AuthorisedWebsitePost/>},

            {path: "/scheduled-task", element: <ScheduledTaskPage/>},
            {path: "/tools", element: <ToolsPage/>},
            {path: "/monitoring", element: <SystemMonitorPage/>},

            {path: "/offline-session", element: <OfflineSessionPage/>},
            {path: "/online-session", element: <OnlineSessionPage/>},
            {path: "/filesystem-log", element: <FileSystemLogPage/>},
            {path: "/access-log", element: <AccessLogPage/>},
            {path: "/access-log-stats", element: <AccessLogStatsPage/>},

            {path: "/ssh-gateway", element: <SshGatewayPage/>},
            {path: "/agent-gateway", element: <AgentGatewayPage/>},

            {path: "/setting", element: <SettingPage/>},
            {path: "/info", element: <InfoPage/>},
        ],
    }
]);


function App() {
    let {t} = useTranslation();

    useEffect(() => {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = `${baseUrl()}/logo`;
    }, []);

    const un_auth = () => {
        window.location.href = '/login';
    }

    const redirect = (url: string) => {
        window.location.href = url;
    }

    const validate_error = (errorCode: number, error: string) => {
        if (window.location.pathname === '/access') {
            return;
        }

        let msg = t(`errors.${errorCode}`);
        if (!msg || msg === `errors.${errorCode}`) {
            msg = error;
        }

        message.error(msg);
    }

    useEffect(() => {
        eventEmitter.on("API:UN_AUTH", un_auth)
        eventEmitter.on("API:REDIRECT", redirect)
        eventEmitter.on("API:VALIDATE_ERROR", validate_error)

        return () => {
            eventEmitter.off("API:UN_AUTH", un_auth)
            eventEmitter.off("API:REDIRECT", redirect)
            eventEmitter.off("API:VALIDATE_ERROR", validate_error)
        }
    }, []);

    return <RouterProvider router={router}/>
}

export default App

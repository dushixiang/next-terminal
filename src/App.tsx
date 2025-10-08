import '@/src/beautiful-scrollbar.css';
import '@/src/App.css';
import React, {lazy, useEffect} from "react";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import '@/src/react-i18next/i18n'
import ManagerLayout from '@/src/layout/ManagerLayout';
import AccessPage from "@/src/pages/access/AccessPage";
import eventEmitter from "@/src/api/core/event-emitter";
import {baseUrl} from "@/src/api/core/requests";
import {useTranslation} from "react-i18next";
import {message} from "antd";

import TerminalPage from "@/src/pages/access/TerminalPage";
import GuacamolePage from "@/src/pages/access/GuacamolePage";

const AuthorisedAssetPage = lazy(() => import("@/src/pages/authorised/AuthorisedAssetPage"));
const AuthorisedWebsitePage = lazy(() => import("@/src/pages/authorised/AuthorisedWebsitePage"));
const AuthorisedAssetPost = lazy(() => import("@/src/pages/authorised/AuthorisedAssetPost"));
const AuthorisedWebsitePost = lazy(() => import("@/src/pages/authorised/AuthorisedWebsitePost"));
const LoginPage = lazy(() => import("@/src/pages/account/LoginPage"));
const WechatWorkCallback = lazy(() => import("@/src/pages/account/WechatWorkCallback"));
const OidcCallback = lazy(() => import("@/src/pages/account/OidcCallback"));
const MobileAccessTerminal = lazy(() => import("@/src/pages/access/MobileAccessTerminal"));
const UserPage = lazy(() => import("@/src/pages/identity/UserPage"));
const UserDetailPage = lazy(() => import("@/src/pages/identity/UserDetailPage"));
const SettingPage = lazy(() => import("@/src/pages/sysconf/SettingPage"));
const InfoPage = lazy(() => import("@/src/pages/account/InfoPage"));
const DepartmentPage = lazy(() => import("@/src/pages/identity/DepartmentPage"));
const DepartmentDetail = lazy(() => import("@/src/pages/identity/DepartmentDetail"));
const RolePage = lazy(() => import("@/src/pages/identity/RolePage"));
const RoleDetail = lazy(() => import("@/src/pages/identity/RoleDetail"));
const LoginLockedPage = lazy(() => import("@/src/pages/identity/LoginLockedPage"));
const LoginPolicyPage = lazy(() => import("@/src/pages/identity/LoginPolicyPage"));
const LoginPolicyPostPage = lazy(() => import("@/src/pages/identity/LoginPolicyPostPage"));
const LoginPolicyDetailPage = lazy(() => import("@/src/pages/identity/LoginPolicyDetailPage"));
const AssetsPage = lazy(() => import("@/src/pages/assets/AssetPage"));
const CredentialPage = lazy(() => import("@/src/pages/assets/CredentialPage"));
const CertificatePage = lazy(() => import("@/src/pages/assets/CertificatePage"));
const SnippetPage = lazy(() => import("@/src/pages/assets/SnippetPage"));
const AssetDetail = lazy(() => import("@/src/pages/assets/AssetDetail"));
const StrategyPage = lazy(() => import("@/src/pages/authorised/StrategyPage"));
const CommandFilterPage = lazy(() => import("@/src/pages/authorised/CommandFilterPage"));
const CommandFilterDetail = lazy(() => import("@/src/pages/authorised/CommandFilterDetail"));
const ScheduledTaskPage = lazy(() => import("@/src/pages/sysops/ScheduledTaskPage"));
const ToolsPage = lazy(() => import("@/src/pages/sysops/ToolsPage"));
const LoginLogPage = lazy(() => import("@/src/pages/audit/LoginLogPage"));
const OperationLogPage = lazy(() => import("@/src/pages/audit/OperationLogPage"));
const OfflineSessionPage = lazy(() => import("@/src/pages/audit/OfflineSessionPage"));
const OnlineSessionPage = lazy(() => import("@/src/pages/audit/OnlineSessionPage"));
const TerminalPlayback = lazy(() => import("@/src/pages/access/TerminalPlayback"));
const TerminalMonitor = lazy(() => import("@/src/pages/access/TerminalMonitor"));
const GuacdPlayback = lazy(() => import("@/src/pages/access/GuacdPlayback"));
const GuacdMonitor = lazy(() => import("@/src/pages/access/GuacdMonitor"));
const FileSystemLogPage = lazy(() => import("@/src/pages/audit/FileSystemLogPage"));
const AccessLogPage = lazy(() => import("@/src/pages/audit/AccessLogPage"));
const AccessLogStatsPage = lazy(() => import("@/src/pages/audit/AccessLogStatsPage"));
const SshGatewayPage = lazy(() => import("@/src/pages/gateway/SshGatewayPage"));
const AgentGatewayPage = lazy(() => import("@/src/pages/gateway/AgentGatewayPage"));
const ErrorPage = lazy(() => import("@/src/components/ErrorPage"));
const StoragePage = lazy(() => import("@/src/pages/assets/StoragePage"));
const WebsitePage = lazy(() => import("@/src/pages/assets/WebsitePage"));
const BrowserPage = lazy(() => import("@/src/pages/access/BrowserPage"));
const FacadePage = lazy(() => import("@/src/pages/facade/FacadePage"));
const WebsiteFacadePage = lazy(() => import("@/src/pages/facade/WebsiteFacadePage"));
const RedirectPage = lazy(() => import("@/src/layout/RedirectPage"));
const UserLayout = lazy(() => import("@/src/layout/UserLayout"));
const DashboardPage = lazy(() => import("@/src/pages/dashboard/DashboardPage"));
const WebsiteDetail = lazy(() => import("@/src/pages/assets/WebsiteDetail"));
const UserInfoPage = lazy(() => import("@/src/pages/facade/UserInfoPage"));
const SnippetUserPage = lazy(() => import("@/src/pages/facade/SnippetUserPage"));
const SystemMonitorPage = lazy(() => import("@/src/pages/sysops/SystemMonitorPage"));
const SetupPage = lazy(() => import("@/src/pages/identity/SetupPage"));

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
            {path: "/asset/:assetId", element: <AssetDetail/>},
            {path: "/credential", element: <CredentialPage/>},
            {path: "/snippet", element: <SnippetPage/>},
            {path: "/storage", element: <StoragePage/>},
            {path: "/website", element: <WebsitePage/>},
            {path: "/website/:websiteId", element: <WebsiteDetail/>},
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

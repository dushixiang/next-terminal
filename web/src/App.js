import React, {Suspense} from 'react';
import {Outlet, Route, Routes} from "react-router-dom";

import './App.css';
import './Arco.css';
import ManagerLayout from "./layout/ManagerLayout";
import UserLayout from "./layout/UserLayout";

import NoMatch from "./components/NoMatch";
import Landing from "./components/Landing";
import NoPermission from "./components/NoPermission";
import Redirect from "./components/Redirect";

const GuacdMonitor = React.lazy(() => import("./components/session/GuacdMonitor"));
const GuacdPlayback = React.lazy(() => import("./components/session/GuacdPlayback"));
const TermMonitor = React.lazy(() => import("./components/session/TermMonitor"));
const TermPlayback = React.lazy(() => import("./components/session/TermPlayback"));

const BatchCommand = React.lazy(() => import("./components/devops/BatchCommand"));
const LoginPolicyDetail = React.lazy(() => import("./components/security/LoginPolicyDetail"));
const Login = React.lazy(() => import("./components/Login"));
const Dashboard = React.lazy(() => import("./components/dashboard/Dashboard"));
const Monitoring = React.lazy(() => import("./components/dashboard/Monitoring"));

const Asset = React.lazy(() => import("./components/asset/Asset"));
const AssetDetail = React.lazy(() => import("./components/asset/AssetDetail"));
const MyFile = React.lazy(() => import("./components/worker/MyFile"));
const AccessGateway = React.lazy(() => import("./components/asset/AccessGateway"));
const MyAsset = React.lazy(() => import("./components/worker/MyAsset"));
const MyCommand = React.lazy(() => import("./components/worker/MyCommand"));
const MyInfo = React.lazy(() => import("./components/worker/MyInfo"));

const Guacd = React.lazy(() => import("./components/access/Guacd"));
const Term = React.lazy(() => import("./components/access/Term"));

const User = React.lazy(() => import("./components/user/user/User"));
const UserDetailPage = React.lazy(() => import("./components/user/user/UserDetailPage"));
const Role = React.lazy(() => import("./components/user/Role"));
const RoleDetail = React.lazy(() => import("./components/user/RoleDetail"));
const UserGroup = React.lazy(() => import("./components/user/UserGroup"));
const UserGroupDetail = React.lazy(() => import("./components/user/UserGroupDetail"));

const Strategy = React.lazy(() => import("./components/authorised/Strategy"));
const StrategyDetail = React.lazy(() => import("./components/authorised/StrategyDetail"));
const Info = React.lazy(() => import("./components/Info"));

const OnlineSession = React.lazy(() => import("./components/session/OnlineSession"));
const OfflineSession = React.lazy(() => import("./components/session/OfflineSession"));
const Command = React.lazy(() => import("./components/asset/Command"));
const ExecuteCommand = React.lazy(() => import("./components/devops/ExecuteCommand"));
const Credential = React.lazy(() => import("./components/asset/Credential"));

const Job = React.lazy(() => import("./components/devops/Job"));
const LoginLog = React.lazy(() => import("./components/log-audit/LoginLog"));
const Security = React.lazy(() => import("./components/security/Security"));
const Storage = React.lazy(() => import("./components/devops/Storage"));

const Setting = React.lazy(() => import("./components/setting/Setting"));
const LoginPolicy = React.lazy(() => import("./components/security/LoginPolicy"));

const App = () => {

    return (
        <Routes>

            <Route path="/" element={<Redirect/>}/>

            <Route element={
                <Suspense fallback={<Landing/>}>
                    <Outlet/>
                </Suspense>
            }>
                <Route path="/access" element={<Guacd/>}/>
                <Route path="/term" element={<Term/>}/>
                <Route path="/term-monitor" element={<TermMonitor/>}/>
                <Route path="/term-playback" element={<TermPlayback/>}/>
                <Route path="/guacd-monitor" element={<GuacdMonitor/>}/>
                <Route path="/guacd-playback" element={<GuacdPlayback/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/permission-denied" element={<NoPermission/>}/>
                <Route path="*" element={<NoMatch/>}/>
            </Route>

            <Route element={<ManagerLayout/>}>
                <Route path="/dashboard" element={<Dashboard/>}/>
                <Route path="/monitoring" element={<Monitoring/>}/>

                <Route path="/user" element={<User/>}/>
                <Route path="/user/:userId" element={<UserDetailPage/>}/>
                <Route path="/role" element={<Role/>}/>
                <Route path="/role/:roleId" element={<RoleDetail/>}/>
                <Route path="/user-group" element={<UserGroup/>}/>
                <Route path="/user-group/:userGroupId" element={<UserGroupDetail/>}/>

                <Route path="/asset" element={<Asset/>}/>
                <Route path="/asset/:assetId" element={<AssetDetail/>}/>
                <Route path="/credential" element={<Credential/>}/>
                <Route path="/command" element={<Command/>}/>
                <Route path="/batch-command" element={<BatchCommand/>}/>
                <Route path="/execute-command" element={<ExecuteCommand/>}/>
                <Route path="/online-session" element={<OnlineSession/>}/>
                <Route path="/offline-session" element={<OfflineSession/>}/>
                <Route path="/login-log" element={<LoginLog/>}/>
                <Route path="/info" element={<Info/>}/>
                <Route path="/setting" element={<Setting/>}/>
                <Route path="/job" element={<Job/>}/>
                <Route path="/file" element={<MyFile/>}/>
                <Route path="/access-security" element={<Security/>}/>
                <Route path="/access-gateway" element={<AccessGateway/>}/>
                <Route path="/storage" element={<Storage/>}/>
                <Route path="/strategy" element={<Strategy/>}/>
                <Route path="/strategy/:strategyId" element={<StrategyDetail/>}/>
                <Route path="/login-policy" element={<LoginPolicy/>}/>
                <Route path="/login-policy/:loginPolicyId" element={<LoginPolicyDetail/>}/>
            </Route>

            <Route element={<UserLayout/>}>
                <Route path="/my-asset" element={<MyAsset/>}/>
                <Route path="/my-info" element={<MyInfo/>}/>
                <Route path="/my-file" element={<MyFile/>}/>
                <Route path="/my-command" element={<MyCommand/>}/>
            </Route>
        </Routes>
    );
}

export default App;

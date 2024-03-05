# Next Terminal

[![Docker guacd build](https://github.com/dushixiang/next-terminal/actions/workflows/docker-guacd.yml/badge.svg)](https://github.com/dushixiang/next-terminal/actions/workflows/docker-guacd.yml)
[![Docker next-terminal build](https://github.com/dushixiang/next-terminal/actions/workflows/docker-next-terminal.yml/badge.svg)](https://github.com/dushixiang/next-terminal/actions/workflows/docker-next-terminal.yml)

## 快速了解

Next Terminal是一个简单好用安全的开源交互审计系统，支持RDP、SSH、VNC、Telnet、Kubernetes协议。

目前支持的功能有：

- 授权凭证管理
- 资产管理（支持RDP、SSH、VNC、TELNET协议）
- 指令管理
- 批量执行命令
- 在线会话管理（监控、强制断开）
- 离线会话管理（查看录屏）
- 双因素认证
- 资产标签
- 资产授权
- 多用户&用户分组
- 计划任务
- ssh server
- 登录策略
- 系统监控

## 在线体验

**web**

https://next.typesafe.cn/ 账号：test  密码：test

**ssh server**

主机：next.typesafe.cn
端口：2022
账号：test  密码：test

## 协议与条款

如您需要在企业网络中使用 next-terminal，建议先征求 IT 管理员的同意。下载、使用或分发 next-terminal 前，您必须同意 [协议](./LICENSE) 条款与限制。本项目不提供任何担保，亦不承担任何责任。

## 快速安装

- [安装文档](https://next-terminal.typesafe.cn)

默认账号密码为 admin/admin 。

## 手动编译

1. 找一台Linux 机器或者Mac
2. 安装 go 1.18 或以上版本
3. 安装 nodejs 16，安装 npm 或 yarn
4. 进入 web 目录 执行 yarn 或 npm install
5. 返回上级目录，也就是项目根目录，执行 sh build.sh

## 问题反馈

- Issues
- 微信群 加我微信拉你进群 (请备注 next-terminal)

<img src="wx.png" width="300"  height="auto"/>

- QQ群 938145268
- Telegram https://t.me/next_terminal

## 安全问题

如果您在使用过程中发现了安全问题，请发送邮件至 helloworld1024@foxmail.com 联系我，谢谢。

## License 

Apache 2.0

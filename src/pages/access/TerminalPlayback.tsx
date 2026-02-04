import React, {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
// @ts-ignore
import * as AsciinemaPlayer from 'asciinema-player';
import 'asciinema-player/dist/bundle/asciinema-player.css';
import {baseUrl, getToken} from "@/api/core/requests";
import {Button, ConfigProvider, Descriptions, Drawer, Table, Tabs, TabsProps, theme} from "antd";
import {TerminalSquare} from "lucide-react";
import {maybe} from "@/utils/maybe";
import {useQuery} from "@tanstack/react-query";
import sessionCommandApi from "@/api/session-command-api";
import {ColumnsType} from "antd/es/table";
import sessionApi, {Session, SessionCommand} from "@/api/session-api";
import {StyleProvider} from '@ant-design/cssinjs';
import {renderSize} from "@/utils/utils";
import times from "@/components/time/times";
import {useTranslation} from "react-i18next";
import strings from "@/utils/strings";
import './TerminalPlayback.css';

const TerminalPlayback = () => {

    let {t} = useTranslation();

    const [searchParams] = useSearchParams();
    const sessionId = maybe(searchParams.get('sessionId'), '');
    let token = maybe(searchParams.get('token'), '');

    let [open, setOpen] = useState(false);
    let [cmds, setCmds] = useState<SessionCommand[]>([]);
    let [session, setSession] = useState<Session>();

    let [player, setPlayer] = useState();

    useEffect(() => {
        let authToken = getToken();
        if (strings.hasText(token)) {
            authToken = token;
        }

        let url = `${baseUrl()}/admin/sessions/${sessionId}/recording?X-Auth-Token=${authToken}`;
        let playerElement = document.getElementById('player');
        let player = AsciinemaPlayer.create(url, playerElement, {
            fit: 'both',
            autoPlay: true,
            terminalFontFamily: 'monaco, Consolas, "Lucida Console", monospace'
        });
        setPlayer(player);
        return () => {
            player.dispose();
        }
    }, []);

    let sessionQuery = useQuery({
        queryKey: ['session'],
        queryFn: () => sessionApi.getById(sessionId)
    });

    useEffect(() => {
        if (sessionQuery.data) {
            setSession(sessionQuery.data);
        }
    }, [sessionQuery.data]);

    let cmdQuery = useQuery({
        queryKey: ['cmd'],
        queryFn: () => {
            return sessionCommandApi.getPaging({
                pageIndex: 1,
                pageSize: 1000,
                sessionId: sessionId,
                sortField: "createdAt",
                sortOrder: "asc",
            })
        }
    });

    useEffect(() => {
        if (cmdQuery.data) {
            setCmds(cmdQuery.data.items);
        }
    }, [cmdQuery.data]);

    const cmdColumns: ColumnsType<SessionCommand> = [
        {
            title: t('sysops.logs.exec_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            width: 170,
            render: (text) => {
                return times.format(text);
            }
        },
        {
            title: t('sysops.command'),
            dataIndex: 'command',
            width: 300,
            ellipsis: true,
        },
    ];

    const items: TabsProps['items'] = [
        {
            key: 'cmd',
            label: t('sysops.command'),
            children: <Table
                // virtual
                rowKey={'path'}
                columns={cmdColumns}
                // scroll={{y: window.innerHeight - 210, x: 'auto'}}
                dataSource={cmds}
                size={'small'}
                pagination={false}
                loading={cmdQuery.isFetching}
                onRow={(cmd, index) => {
                    return {
                        onClick: () => {
                            let connected = session?.connectedAt ? session?.connectedAt : 0;
                            let pos = (cmd.createdAt - connected) / 1000;
                            // @ts-ignore
                            player?.seek(pos - 0.5);
                        }
                    }
                }}
            />,
        },
        {
            key: 'info',
            label: t('actions.detail'),
            children: <Descriptions
                column={1}
                items={[
                    {
                        key: 'clientIp',
                        label: t('audit.client_ip'),
                        children: session?.clientIp,
                    },
                    {
                        key: 'userAccount',
                        label: t('menus.identity.submenus.user'),
                        children: session?.userAccount,
                    },
                    {
                        key: 'assetName',
                        label: t('menus.resource.submenus.asset'),
                        children: session?.assetName,
                    },
                    {
                        key: 'addr',
                        label: t('assets.addr'),
                        children: `${session?.protocol} ${session?.username}@${session?.ip}:${session?.port}`,
                    },
                    {
                        key: 'connectedAt',
                        label: t('audit.connected_at'),
                        children: times.format(session?.connectedAt),
                    },
                    {
                        key: 'disconnectedAt',
                        label: t('audit.disconnected_at'),
                        children: times.format(session?.disconnectedAt),
                    },
                    {
                        key: 'connectionDuration',
                        label: t('audit.connection_duration'),
                        children: session?.connectionDuration,
                    },
                    {
                        key: 'recordingSize',
                        label: t('audit.recording_size'),
                        children: renderSize(session?.recordingSize),
                    },
                ]}/>,
        },
    ];

    return (
        <div className={'flex w-screen h-screen items-center justify-center'}>
            <div id='player'
                 className={'w-full h-full bg-[#191919] overflow-hidden'}
            >

            </div>

            <Button className={'absolute top-5 right-5'}
                    type={'link'}
                    size={'small'}
                    onClick={() => setOpen(true)}>
                <TerminalSquare className="h-4 w-4"/>
            </Button>

            <ConfigProvider theme={{
                algorithm: theme.darkAlgorithm,
                components: {
                    Drawer: {
                        paddingLG: 16
                    },
                    Table: {
                        cellPaddingBlockSM: 6,
                        headerBorderRadius: 4,
                    }
                }
            }}>
                <StyleProvider hashPriority="high">
                    <Drawer title={t('actions.detail')}
                            placement="right"
                            onClose={() => setOpen(false)}
                            open={open}
                            mask={false}
                            width={400}
                    >
                        <Tabs defaultActiveKey="cmd" items={items}/>
                    </Drawer>
                </StyleProvider>
            </ConfigProvider>
        </div>

    );
};

export default TerminalPlayback;
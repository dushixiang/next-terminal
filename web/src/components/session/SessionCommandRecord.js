import React, {useEffect} from 'react';
import {ProTable} from "@ant-design/pro-components";
import sessionApi from "../../api/session";
import {Popover, Tag} from "antd";
import strings from "../../utils/strings";

const actionRef = React.createRef();

const SessionCommandRecord = ({visible, sessionId}) => {

    useEffect(() => {
        if (sessionId) {
            actionRef.current.reload();
        }
    }, [visible]);

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '输入命令',
            dataIndex: 'command',
            width: 300,
            copyable: true,
            ellipsis: true,
        },
        {
            title: '风险等级',
            dataIndex: 'riskLevel',
            render: (text, record) => {
                if (text === 1) {
                    return <Tag color="red">高危</Tag>
                }
                return <Tag color="blue">一般</Tag>
            },
            hideInSearch: true,
            width: 75,
        },
        {
            title: '执行时间',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
            width: 170,
        },
        {
            title: '输出结果',
            key: 'result',
            hideInSearch: true,
            dataIndex: 'result',
            render: (text, record) => {
                if (!strings.hasText(text)) {
                    return '';
                }

                let lines = text.split('\r\n');
                if (lines.length > 1) {
                    const content = <pre className='code'>
                            <code>{text}</code>
                        </pre>

                    return <Popover content={content}>
                        <pre className='code'
                             style={{
                                 cursor: 'pointer',
                                 color: '#0050b3',
                                 textDecoration: 'underline',
                        }}>
                            <code>文本过长，鼠标移动到此查看完整内容。</code>
                        </pre>
                    </Popover>
                } else {
                    return <pre className='code'>
                            <code>{text}</code>
                        </pre>;
                }
            }
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {

                    let field = '';
                    let order = '';
                    if (Object.keys(sort).length > 0) {
                        field = Object.keys(sort)[0];
                        order = Object.values(sort)[0];
                    }

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        command: params.command,
                        field: field,
                        order: order
                    }
                    let result = await sessionApi.GetCommandPagingBySessionId(sessionId, queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                pagination={{
                    pageSize: 10,
                }}
                dateFormatter="string"
                headerTitle="命令记录"
            />
        </div>
    );
};

export default SessionCommandRecord;
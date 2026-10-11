import {Alert, Button, Form, Input} from 'antd';
import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';

/**
 * SSH 交互式认证的 pre-connect 面板。
 *
 * 状态机与 termark SDK 认证标准对齐：服务端按结构化错误码 / keyboard-interactive
 * 回调发来 AuthPrompt，前端渲染对应面板，用户提交后经 AuthReply 回传。
 */

export interface KeyboardInteractiveChallenge {
    name?: string;
    instruction?: string;
    questions: string[];
    echos?: boolean[];
}

export type TerminalPreConnectState =
    | {type: 'username'; message?: string; retry?: boolean}
    | {type: 'password'; username: string; message?: string; retry?: boolean}
    | {type: 'passphrase'; message?: string; retry?: boolean}
    | {type: 'keyboard-interactive'; challenge: KeyboardInteractiveChallenge; message?: string; retry?: boolean};

export interface TerminalAuthReply {
    kind: string;
    username?: string;
    password?: string;
    passphrase?: string;
    answers?: string[];
}

interface Props {
    state: TerminalPreConnectState;
    onSubmit: (reply: TerminalAuthReply) => void;
    onCancel: () => void;
}

interface FormValues {
    username?: string;
    password?: string;
    passphrase?: string;
    answers?: string[];
}

const TerminalPreConnect = ({state, onSubmit, onCancel}: Props) => {

    const {t} = useTranslation();
    const [form] = Form.useForm<FormValues>();

    useEffect(() => {
        form.resetFields();
    }, [state, form]);

    const initialValues: FormValues = {};
    if (state.type === 'password') {
        initialValues.username = state.username;
    }

    const title = () => {
        switch (state.type) {
            case 'username':
                return t('access.terminal.auth.title_username');
            case 'password':
                return t('access.terminal.auth.title_password');
            case 'passphrase':
                return t('access.terminal.auth.title_passphrase');
            default:
                return t('access.terminal.auth.title_keyboard_interactive');
        }
    };

    const submit = (values: FormValues) => {
        switch (state.type) {
            case 'username':
                onSubmit({kind: 'username', username: (values.username ?? '').trim()});
                break;
            case 'password':
                onSubmit({kind: 'password', username: (values.username ?? '').trim(), password: values.password});
                break;
            case 'passphrase':
                onSubmit({kind: 'passphrase', passphrase: values.passphrase});
                break;
            default:
                onSubmit({kind: 'keyboard-interactive', answers: values.answers ?? []});
        }
    };

    const renderAlert = () => {
        const description: React.ReactNode[] = [];
        if (state.message) {
            description.push(<div key="message">{state.message}</div>);
        }
        if (state.type === 'keyboard-interactive') {
            if (state.challenge.name) {
                description.push(<div key="name">{state.challenge.name}</div>);
            }
            if (state.challenge.instruction) {
                description.push(<div key="instruction">{state.challenge.instruction}</div>);
            }
        }
        if (description.length === 0) {
            return null;
        }
        return (
            <div className="mb-4">
                <Alert
                    type={state.retry ? 'error' : 'info'}
                    showIcon
                    title={t('access.terminal.auth.auth_required')}
                    description={<div className="space-y-1">{description}</div>}
                />
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-4 rounded-lg border border-gray-700 bg-[#1E1F22] p-6 shadow-2xl">
                <h2 className="text-base font-semibold text-gray-100">{title()}</h2>
                {renderAlert()}
                <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit}>
                    {state.type === 'username' && (
                        <Form.Item
                            name="username"
                            label={t('access.terminal.auth.username')}
                            rules={[{required: true, whitespace: true}]}
                        >
                            <Input autoFocus autoComplete="username"/>
                        </Form.Item>
                    )}
                    {state.type === 'password' && (
                        <>
                            <Form.Item
                                name="username"
                                label={t('access.terminal.auth.username')}
                                rules={[{required: true, whitespace: true}]}
                            >
                                <Input autoFocus autoComplete="username"/>
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label={t('access.terminal.auth.password')}
                            >
                                <Input.Password autoComplete="current-password"/>
                            </Form.Item>
                        </>
                    )}
                    {state.type === 'passphrase' && (
                        <Form.Item
                            name="passphrase"
                            label={t('access.terminal.auth.passphrase')}
                            rules={[{required: true}]}
                        >
                            <Input.Password autoFocus autoComplete="off"/>
                        </Form.Item>
                    )}
                    {state.type === 'keyboard-interactive' && (
                        <>
                            {(state.challenge.questions.length > 0 ? state.challenge.questions : ['']).map((question, index) => (
                                <Form.Item
                                    key={`${question}-${index}`}
                                    name={['answers', index]}
                                    label={question || t('access.terminal.auth.answer')}
                                    rules={[{required: false}]}
                                >
                                    {state.challenge.echos?.[index] === true ? (
                                        <Input autoFocus={index === 0} autoComplete="off"/>
                                    ) : (
                                        <Input.Password autoFocus={index === 0} autoComplete="one-time-code"/>
                                    )}
                                </Form.Item>
                            ))}
                        </>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button onClick={onCancel}>{t('access.terminal.auth.cancel')}</Button>
                        <Button type="primary" htmlType="submit">{t('access.terminal.auth.connect')}</Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default TerminalPreConnect;

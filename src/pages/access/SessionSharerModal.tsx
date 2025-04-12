import React, {useEffect, useRef, useState} from 'react';
import {App, Button, Empty, Modal, Typography} from "antd";
import {ProForm, ProFormInstance} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import portalApi from "@/src/api/portal-api";
import copy from "copy-to-clipboard";
import {SessionSharer} from "@/src/api/session-api";

interface Props {
    open: boolean
    onClose: () => void
    sessionId: string
}

const {Paragraph} = Typography;

const SessionSharerModal = ({open, onClose, sessionId}: Props) => {

    let {t} = useTranslation();
    const formRef = useRef<ProFormInstance>();

    let {message} = App.useApp();

    let [sharer, setSharer] = useState<SessionSharer>({
        ok: false,
        url: ''
    });

    let getSharer = useQuery({
        queryKey: ['getSharer'],
        queryFn: () => portalApi.getShare(sessionId),
        enabled: open,
    });

    useEffect(() => {
        if (getSharer.data) {
            setSharer(getSharer.data);
        }
    }, [open, getSharer.data]);

    const handleCreateShare = async () => {
        formRef.current?.validateFields()
            .then(async values => {
                await portalApi.createShare(sessionId, values['securityToken']);
                await getSharer.refetch();
                formRef.current?.resetFields();
            });
    }

    const handleCancelShare = async () => {
        await portalApi.cancelShare(sessionId);
        await getSharer.refetch();
    }

    const renderURL = () => {
        let url = sharer.url;
        if (url == '') {
            return ''
        }
        // http://127.0.0.1:8088/terminal?sessionId=SN_maX4dVgCL77j18eFUGiQLvHuywgAzSvA1ne1XsycuyoSwotsu&token=temporary_4K7nnuXtucL7PQwCiYrcDTY8CzSfNtdfwPeJYMpG1btE&sharer=true
        // 解析url，替换系统根路径为当前地址
        if (import.meta.env.DEV) {
            return url.replaceAll('127.0.0.1:8088', 'localhost:5173')
        }
        return url;
    }

    const handleCopy = () => {
        copy(renderURL());
        message.success(t('general.copy_success'));
        onClose();
    }

    return (
        <Modal
            title={t('access.session.share.action')}
            open={open}
            // maskClosable={false}
            destroyOnClose={true}
            onCancel={onClose}
            footer={false}
        >
            {
                sharer.ok ?
                    <div>
                        <div className={'bg-black p-4 rounded'}>
                            <Paragraph copyable={true} style={{margin: 0}}>{renderURL()}</Paragraph>
                        </div>
                        <div className={'pt-4 flex gap-4'}>
                            <Button type="primary" danger onClick={handleCancelShare}>{t('access.session.share.cancel')}</Button>
                            <Button type="primary" onClick={handleCopy}>{t('actions.copy')}</Button>
                        </div>
                    </div> :
                    <div>
                        {/*<Alert type={'warning'} message={'请注意权限'}/>*/}
                        <ProForm formRef={formRef} submitter={false}>
                            <Empty/>
                            <div className={'pt-4 flex items-center justify-center'}>
                                <Button type="primary" onClick={handleCreateShare} style={{width: '100%'}}>
                                    {t('access.session.share.action')}
                                </Button>
                            </div>
                        </ProForm>
                    </div>
            }
        </Modal>
    );
};

export default SessionSharerModal;
import React, {useState} from 'react';
import {Alert, Button, message, Space, Typography} from "antd";
import requests from "@/src/api/core/requests";
import {useTranslation} from "react-i18next";

const {Title} = Typography;

const BackupSetting = () => {

    let {t} = useTranslation();
    let [loading, setLoading] = useState(false);

    const handleImport = (files: FileList | null) => {
        if (!files) {
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            let backup = JSON.parse(reader.result.toString());
            setLoading(true);
            try {
                await requests.post('/admin/backup/import', backup);
                message.success('恢复成功', 3);
            } finally {
                // window.document.getElementById('file-upload').value = "";
                setLoading(false);
            }
        };
        reader.readAsText(files[0]);
    }

    return (
        <div>
            <Title level={5} style={{ marginTop: 0 }}>{t('settings.backup.setting')}</Title>

            <Space direction="vertical">
                <Alert
                    message={t('settings.backup.tip')}
                    type="info"
                />

                <Space>
                    {/*<Button type="primary" onClick={() => {*/}

                    {/*}}>*/}
                    {/*    导出备份*/}
                    {/*</Button>*/}

                    <Button loading={loading} onClick={() => {
                        document.getElementById('file-upload').click();
                    }}>
                        {t('settings.backup.recovery')}
                    </Button>
                    <input type="file"
                           id="file-upload"
                           style={{display: 'none'}}
                           accept={".json"}
                           onChange={async (e) => {
                               let files = e.target.files;
                               await handleImport(files);
                               e.target.value = '';
                           }}
                    />
                </Space>
            </Space>
        </div>
    );
};

export default BackupSetting;
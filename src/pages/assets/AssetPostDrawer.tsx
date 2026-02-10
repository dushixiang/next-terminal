import React, { useMemo, useRef } from 'react';
import { Button, Drawer, Space } from "antd";
import AssetsPost from "@/pages/assets/AssetPost";
import {useTranslation} from "react-i18next";

interface Props {
    open: boolean;
    onClose: () => void;

    assetId?: string;
    groupId?: string;
    copy?: boolean;
}

const AssetPostDrawer = ({open, onClose, assetId, groupId, copy}: Props) => {
    let {t} = useTranslation();
    const contentRef = useRef<HTMLDivElement>(null);

    let title = assetId ? t('actions.edit') : t('actions.new')
    if(copy){
        title = t('actions.copy')
    }

    const drawerWidth = 1200;

    const handleSave = () => {
        const form = contentRef.current?.querySelector('form') as HTMLFormElement | null;
        if (!form) {
            return;
        }
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
            return;
        }
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    const drawerExtra = (
        <Space size={8}>
            <Button onClick={onClose}>
                {t('actions.cancel')}
            </Button>
            <Button type="primary" onClick={handleSave}>
                {t('actions.save')}
            </Button>
        </Space>
    );

    return (
        <div>
            <Drawer
                title={title}
                extra={drawerExtra}
                onClose={onClose}
                open={open}
                width={drawerWidth}
                destroyOnHidden={true}
            >
                <div ref={contentRef}>
                    <AssetsPost
                        assetId={assetId}
                        groupId={groupId}
                        copy={copy}
                        onClose={onClose}
                    />
                </div>
            </Drawer>
        </div>
    );
};

export default AssetPostDrawer;

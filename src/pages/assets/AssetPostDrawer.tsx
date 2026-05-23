import React, {useRef} from 'react';
import {Modal} from "antd";
import AssetsPost from "@/pages/assets/AssetPost";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";

interface Props {
    open: boolean;
    onClose: () => void;

    assetId?: string;
    groupId?: string;
    copy?: boolean;
}

const AssetPostDrawer = ({open, onClose, assetId, groupId, copy}: Props) => {
    let {t} = useTranslation();
    const navigate = useNavigate();
    const contentRef = useRef<HTMLDivElement>(null);

    let title = assetId ? t('actions.edit') : t('actions.new')
    if(copy){
        title = t('actions.copy')
    }

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

    return (
        <div>
            <Modal
                title={title}
                open={open}
                width={800}
                destroyOnHidden={true}
                okText={t('actions.save')}
                cancelText={t('actions.cancel')}
                onOk={handleSave}
                onCancel={onClose}
                mask={{
                    closable: false
                }}
            >
                <div ref={contentRef}>
                    <AssetsPost
                        hideLogo={true}
                        assetId={assetId}
                        groupId={groupId}
                        copy={copy}
                        showAdvanced={false}
                        onClose={onClose}
                        onSuccess={(asset) => {
                            if (asset?.id) {
                                navigate(`/asset/${asset.id}`);
                            }
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default AssetPostDrawer;

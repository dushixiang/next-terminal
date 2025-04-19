import React from 'react';
import {Drawer} from "antd";
import AssetsPost from "@/src/pages/assets/AssetPost";
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

    let title = assetId ? t('actions.edit') : t('actions.new')
    if(copy){
        title = t('actions.copy')
    }
    return (
        <div>
            <Drawer title={title}
                    onClose={onClose}
                    open={open}
                    width={window.innerWidth - 200}
                    destroyOnClose={true}
            >
                <AssetsPost
                    assetId={assetId}
                    groupId={groupId}
                    copy={copy}
                    onClose={onClose}
                />
            </Drawer>
        </div>
    );
};

export default AssetPostDrawer;
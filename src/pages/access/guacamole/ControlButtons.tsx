// components/ControlButtons.tsx
import React from 'react';
import {Dropdown, FloatButton} from 'antd';
import {
    CopyOutlined,
    ExpandOutlined,
    FolderOutlined,
    ShareAltOutlined,
    ToolOutlined,
    WindowsOutlined
} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';

interface MenuItem {
    key: string;
    label: string;
}

interface Props {
    sessionId?: string;
    hasFileSystem?: boolean;
    onOpenFS: () => void;
    onShare: () => void;
    onClipboard: () => void;
    onFull: () => void;
    onSendKeys: (keys: string[]) => void;
}

const comboMenu: MenuItem[] = [
    {key: '65507+65513+65535', label: 'Ctrl+Alt+Delete'},
    {key: '65507+65513+65228', label: 'Ctrl+Alt+Backspace'},
    {key: '65515+100', label: 'Window+D'},
    {key: '65515+101', label: 'Window+E'},
    {key: '65515+114', label: 'Window+R'},
    {key: '65515+120', label: 'Window+X'},
    {key: '65515', label: 'Window'},
    // …other combos
];

const ControlButtons: React.FC<Props> = ({hasFileSystem, onOpenFS, onShare, onClipboard, onFull, onSendKeys}) => {
    const {t} = useTranslation();
    const [open, setOpen] = React.useState(false);

    const handleMenuClick = (e: any) => {
        const keys = e.key.split('+');
        onSendKeys(keys);
    };

    return (
        <FloatButton.Group shape="circle" open={open} trigger="click" icon={<ToolOutlined/>}
                           onClick={() => setOpen(!open)}>
            {hasFileSystem &&
                <FloatButton icon={<FolderOutlined/>} tooltip={t('access.filesystem')} onClick={onOpenFS}/>}
            <FloatButton icon={<ShareAltOutlined/>} tooltip={t('access.session.share.action')} onClick={onShare}/>
            <FloatButton icon={<CopyOutlined/>} tooltip={t('access.clipboard')} onClick={onClipboard}/>
            <Dropdown menu={{items: comboMenu, onClick: handleMenuClick}} trigger={['click']} placement="bottomLeft">
                <FloatButton icon={<WindowsOutlined/>} tooltip={t('access.combination_key')}/>
            </Dropdown>
            <FloatButton icon={<ExpandOutlined/>} tooltip={t('access.toggle_full_screen')} onClick={onFull}/>
        </FloatButton.Group>
    );
};

export default ControlButtons;
import React from 'react';
import { Dropdown, Menu } from 'antd';
import { useTranslation } from 'react-i18next';

interface TabContextMenuProps {
  children: React.ReactNode;
  tabKey: string;
  currentActiveKey: string;
  allTabs: Array<{ key: string; label: string }>;
  onCloseLeft: (key: string) => void;
  onCloseRight: (key: string) => void;
  onCloseAll: () => void;
  onCloseOthers: (key: string) => void;
  onReconnect: (key: string) => void;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  children,
  tabKey,
  currentActiveKey,
  allTabs,
  onCloseLeft,
  onCloseRight,
  onCloseAll,
  onCloseOthers,
  onReconnect,
}) => {
  const { t } = useTranslation();

  const currentIndex = allTabs.findIndex(tab => tab.key === tabKey);
  const hasLeftTabs = currentIndex > 0;
  const hasRightTabs = currentIndex < allTabs.length - 1;

  const menuItems = [
    {
      key: 'close-left',
      label: t('access.tabs.closeLeft'),
      disabled: !hasLeftTabs,
      onClick: () => onCloseLeft(tabKey),
    },
    {
      key: 'close-right',
      label: t('access.tabs.closeRight'),
      disabled: !hasRightTabs,
      onClick: () => onCloseRight(tabKey),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'close-all',
      label: t('access.tabs.closeAll'),
      onClick: onCloseAll,
    },
    {
      key: 'close-others',
      label: t('access.tabs.closeOthers'),
      disabled: allTabs.length <= 1,
      onClick: () => onCloseOthers(tabKey),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'reconnect',
      label: t('access.tabs.reconnect'),
      onClick: () => onReconnect(tabKey),
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
    >
      {children}
    </Dropdown>
  );
};

export default TabContextMenu;
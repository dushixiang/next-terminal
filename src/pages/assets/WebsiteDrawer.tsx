import React, {useRef} from 'react';
import {Button, Modal, Space} from 'antd';
import {useTranslation} from "react-i18next";
import WebsitePost from "@/pages/assets/WebsitePost";

export interface WebsiteDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  id?: string;
}

const WebsiteDrawer: React.FC<WebsiteDrawerProps> = ({
  open,
  onClose,
  onSuccess,
  id
}) => {
  const {t} = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    const form = contentRef.current?.querySelector('form') as HTMLFormElement | null;
    if (!form) {
      return;
    }
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
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
    <Modal
      title={id ? t('actions.edit') : t('actions.new')}
      onCancel={onClose}
      open={open}
      width={760}
      className="website-drawer"
      destroyOnHidden={true}
      footer={drawerExtra}
    >
      <div ref={contentRef}>
        <WebsitePost
          id={id}
          open={open}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </Modal>
  );
};

export default WebsiteDrawer;

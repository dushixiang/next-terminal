import { App, Button, Empty, Modal, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import copy from 'copy-to-clipboard';
import { useTranslation } from 'react-i18next';

import Disabled from '@/components/Disabled';
import { useLicense } from '@/hook/LicenseContext';
import portalApi from '@/api/portal-api';
import { SessionSharer } from '@/api/session-api';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

const { Paragraph } = Typography;

const emptySharer: SessionSharer = {
  ok: false,
  url: '',
};

const SessionSharerModal = ({ open, onClose, sessionId }: Props) => {
  const { t } = useTranslation();
  const { license } = useLicense();
  const { message } = App.useApp();

  const {
    data: sharer = emptySharer,
    refetch: refetchSharer,
  } = useQuery({
    queryKey: ['getSharer', sessionId],
    queryFn: () => portalApi.getShare(sessionId),
    enabled: open && !!sessionId && license.hasPremiumFeatures(),
  });

  const handleCreateShare = async () => {
    if (!sessionId || !license.hasPremiumFeatures()) {
      return;
    }

    await portalApi.createShare(sessionId, '');
    await refetchSharer();
  };

  const handleCancelShare = async () => {
    if (!sessionId || !license.hasPremiumFeatures()) {
      return;
    }

    await portalApi.cancelShare(sessionId);
    await refetchSharer();
  };

  const renderURL = () => {
    if (!sharer.url) {
      return '';
    }

    return new URL(sharer.url, window.location.origin).toString();
  };

  const handleCopy = () => {
    if (!license.hasPremiumFeatures()) {
      return;
    }

    copy(renderURL());
    message.success(t('general.copy_success'));
    onClose();
  };

  return (
    <Modal
      title={t('access.session.share.action')}
      open={open}
      destroyOnHidden={true}
      onCancel={onClose}
      footer={false}
    >
      <Disabled feature="session_sharing" compact disabled={!license.hasPremiumFeatures()}>
        <Paragraph type="secondary">{t('access.session.share.tip')}</Paragraph>
        {sharer.ok ? (
          <div>
            <div className="bg-black p-4 rounded">
              <Paragraph copyable={true} style={{ margin: 0 }}>
                {renderURL()}
              </Paragraph>
            </div>
            <div className="pt-4 flex gap-4">
              <Button type="primary" danger onClick={handleCancelShare}>
                {t('access.session.share.cancel')}
              </Button>
              <Button type="primary" onClick={handleCopy}>
                {t('actions.copy')}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Empty />
            <div className="pt-4 flex items-center justify-center">
              <Button type="primary" onClick={handleCreateShare} style={{ width: '100%' }}>
                {t('access.session.share.create')}
              </Button>
            </div>
          </div>
        )}
      </Disabled>
    </Modal>
  );
};

export default SessionSharerModal;

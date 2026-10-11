import {rotationMessage} from "./rotation-message";
import {useTranslation} from 'react-i18next';
import {Modal} from 'antd';
import {CheckCircleFilled, CloseCircleFilled} from '@ant-design/icons';
import {RotationResult} from '@/api/credential-rotation-api';

const RotationResultModal = ({
    open,
    handleCancel,
    results,
}: Props) => {
    const {t} = useTranslation();

    const successCount = results.filter(item => item.success).length;

    return <Modal
        title={t('assets.rotation.result_title', {success: successCount, total: results.length})}
        open={open}
        footer={null}
        width={560}
        onCancel={handleCancel}
        destroyOnHidden={true}
    >
        <div className="flex max-h-[420px] flex-col gap-2 overflow-auto">
            {results.map((item, index) => (
                <div key={index} className="flex items-start gap-2 rounded-md border border-gray-100 p-2 dark:border-gray-800">
                    {item.success
                        ? <CheckCircleFilled className="mt-0.5 text-green-500"/>
                        : <CloseCircleFilled className="mt-0.5 text-red-500"/>}
                    <div className="min-w-0 flex-1">
                        <div className="font-medium">{item.assetName}</div>
                        {item.message && <div className="text-sm break-all text-gray-500" title={item.message}>{rotationMessage(item.message, t)}</div>}
                    </div>
                </div>
            ))}
        </div>
    </Modal>;
};

interface Props {
    open: boolean;
    handleCancel: () => void;
    results: RotationResult[];
}

export default RotationResultModal;

import React from 'react';
import { Form, Popover, Upload } from "antd";
import { useTranslation } from "react-i18next";
import { TrashIcon, UploadIcon } from "lucide-react";

import { LogoItem } from "@/pages/assets/website-drawer/types";
import { validateFileSize } from "@/pages/assets/website-drawer/utils";

interface LogoSelectorProps {
    logo?: string;
    onLogoChange: (logo: string) => void;
    logosData?: LogoItem[];
}

const LogoSelector: React.FC<LogoSelectorProps> = ({ logo, onLogoChange, logosData }) => {
    const { t } = useTranslation();

    const handleUploadRequest = ({ file, onSuccess }: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            onLogoChange(result);
            onSuccess?.(result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <Form.Item name="logo" label={t('assets.logo')}>
            <Popover
                placement="bottomRight"
                content={
                    <div className="grid grid-cols-8 gap-2">
                        {logosData?.map(item => (
                            <div
                                key={item.name}
                                className="h-10 w-10 rounded-lg cursor-pointer border p-2 hover:border-blue-500"
                                onClick={() => onLogoChange(item.data)}
                            >
                                <img src={item.data} alt={item.name} className="w-full h-full object-contain" />
                            </div>
                        ))}

                        <div
                            className="h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-red-500 flex items-center justify-center hover:bg-red-50"
                            onClick={() => onLogoChange('')}
                        >
                            <TrashIcon className="text-red-500 h-4 w-4" />
                        </div>

                        <Upload
                            maxCount={1}
                            showUploadList={false}
                            customRequest={handleUploadRequest}
                            beforeUpload={validateFileSize}
                        >
                            <div className="h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center hover:bg-blue-50">
                                <UploadIcon className="text-blue-500 h-4 w-4" />
                            </div>
                        </Upload>
                    </div>
                }
                trigger="click"
            >
                <div className="w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer border-blue-200 dark:border-blue-700 hover:border-blue-500">
                    {logo && <img src={logo} alt="logo" className="w-full h-full object-contain" />}
                </div>
            </Popover>
        </Form.Item>
    );
};

export default LogoSelector;

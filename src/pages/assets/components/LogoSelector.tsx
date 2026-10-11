import React from 'react';
import {App, Form, Popover, Upload, type UploadProps} from "antd";
import {useQuery} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TrashIcon, UploadIcon } from "lucide-react";

import assetsApi from "@/api/asset-api";

interface LogoSelectorProps {
    logo?: string;
    onLogoChange: (logo: string) => void;
    extra?: React.ReactNode;
}

const LogoSelector: React.FC<LogoSelectorProps> = ({ logo, onLogoChange, extra }) => {
    const { t } = useTranslation();
    const {message} = App.useApp();

    const logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    const handleUploadRequest = ({ file, onSuccess }: any) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            onLogoChange(result);
            onSuccess?.(result);
        };
        reader.readAsDataURL(file);
    };

    const beforeUpload: UploadProps['beforeUpload'] = (file) => {
        if (file.size > 1024 * 1024) {
            message.error(t('settings.logo.file_too_large'));
            return false;
        }
        return true;
    };

    const logoPopover = (
        <div className="space-y-3">
            {extra && (
                <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
                    {extra}
                </div>
            )}
            <div className="grid grid-cols-8 gap-2">
                {logosQuery.data?.map(item => (
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
                    beforeUpload={beforeUpload}
                >
                    <div className="h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center hover:bg-blue-50">
                        <UploadIcon className="text-blue-500 h-4 w-4" />
                    </div>
                </Upload>
            </div>
        </div>
    );

    return (
        <Form.Item name="logo" label={t('assets.logo')}>
            <Popover
                placement="rightTop"
                content={logoPopover}
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

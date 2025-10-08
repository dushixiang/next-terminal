import React, {useState, useEffect} from 'react';
import {Form, Popover, Upload, App} from "antd";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {TrashIcon, UploadIcon} from "lucide-react";
import {RcFile} from "antd/es/upload";
import assetsApi from "../../../api/asset-api";

interface AssetLogoProps {
    value?: string;
    onChange?: (value: string) => void;
}

const AssetLogo: React.FC<AssetLogoProps> = ({value, onChange}) => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const [logo, setLogo] = useState<string>(value || '');

    const logosQuery = useQuery({
        queryKey: ['get-logos'],
        queryFn: assetsApi.getLogos,
    });

    useEffect(() => {
        setLogo(value || '');
    }, [value]);

    const handleLogoChange = (newLogo: string) => {
        setLogo(newLogo);
        onChange?.(newLogo);
    };

    const beforeUpload = (file: RcFile) => {
        const isTooLarge = file.size / 1024 / 1024;
        if (!isTooLarge) {
            message.error('Image must smaller than 1MB!');
            return false;
        }
        return true;
    };

    const handleUploadRequest = ({file}: any) => {
        const reader = new FileReader();
        if (file) {
            reader.readAsDataURL(file);
            reader.onloadend = function () {
                const logoData = reader.result as string;
                handleLogoChange(logoData);
            }
        }
    };

    const logoPopover = () => {
        return (
            <div>
                <div className={'grid grid-cols-8 gap-2'}>
                    {logosQuery.data?.map(item => (
                        <div 
                            className={'h-10 w-10 rounded-lg cursor-pointer border p-2'}
                            onClick={() => handleLogoChange(item.data)}
                            key={item.name}
                        >
                            <img key={item.name} src={item.data} alt={item.name}/>
                        </div>
                    ))}

                    <div
                        className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-red-500 flex items-center justify-center'}
                        onClick={() => handleLogoChange('')}
                    >
                        <TrashIcon className={'text-red-500 h-4 w-4'}/>
                    </div>

                    <Upload
                        maxCount={1}
                        showUploadList={false}
                        customRequest={handleUploadRequest}
                        beforeUpload={beforeUpload}
                    >
                        <div
                            className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center'}>
                            <UploadIcon className={'text-blue-500 h-4 w-4'}/>
                        </div>
                    </Upload>
                </div>
            </div>
        );
    };

    return (
        <Form.Item name={'logo'} label={t('assets.logo')}>
            <Popover placement="rightTop" content={logoPopover()}>
                <div
                    className={'w-10 h-10 border border-dashed rounded-lg p-2 flex items-center justify-center cursor-pointer hover:border-blue-500'}>
                    {logo ? <img className={''} src={logo} alt="logo"/> : ''}
                </div>
            </Popover>
        </Form.Item>
    );
};

export default AssetLogo;

import React, {ReactNode} from 'react';
import {LoadingOutlined} from "@ant-design/icons";
import {cn} from "@/lib/utils";

interface VersionInfoProps {
    label: string;
    isPending: boolean;
    error: Error | null;
    value?: ReactNode;
    errorText: string;
    isMobile?: boolean;
}

/**
 * 版本信息展示组件
 * 用于展示当前版本或最新版本
 */
export const VersionInfo: React.FC<VersionInfoProps> = ({
                                                            label,
                                                            isPending,
                                                            error,
                                                            value,
                                                            errorText,
                                                            isMobile = false
                                                        }) => {
    const renderContent = () => {
        if (isPending) {
            return <LoadingOutlined/>;
        }
        if (error != null) {
            return <div style={{color: 'red'}}>{errorText}</div>;
        }
        return <div className="font-normal ml-1">{value}</div>;
    };

    return (
        <div className={cn('font-bold flex items-center gap-2', isMobile && 'text-sm')}>
            <div>{label}: </div>
            <div>{renderContent()}</div>
        </div>
    );
};


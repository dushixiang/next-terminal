import { logoApi } from "@/api/logo-api";
import { useQuery } from "@tanstack/react-query";
import { App,Popconfirm,Tooltip,TreeDataNode,Upload,type UploadProps } from "antd";
import { UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TreeSelectDataNode {
    title: TreeDataNode['title'];
    value: string;
    children: TreeSelectDataNode[];
}

const LogoSetting = () => {
    let {t} = useTranslation();
    const {message} = App.useApp();

    let logosQuery = useQuery({
        queryKey: ['system-logos'],
        queryFn: logoApi.logos,
    });

    const beforeUpload: UploadProps['beforeUpload'] = (file) => {
        if (file.size <= 0) {
            message.error(t('settings.logo.empty_file'));
            return false;
        }
        return true;
    };

    const handleUploadRequest = async ({file, onSuccess}: any) => {
        //声明js的文件流
        logoApi.upload(file).then(res => {
            logosQuery.refetch();
            onSuccess(res);
        });
    }

    const transformData = (data: TreeDataNode[]): TreeSelectDataNode[] => {
        return data.map(item => {
            const newItem: TreeSelectDataNode = {
                title: item.title,
                value: item.key as string,
                // key: item.key,
                children: [],
            };
            if (item.children) {
                newItem.children = transformData(item.children);
            }
            return newItem;
        });
    };

    return (
        <div className={'space-y-2'}>
            <div>{t('settings.logo.preset')}</div>
            <div className={'flex items-center gap-2 flex-wrap'}>
                {logosQuery.data?.filter(item => !item.deletable)
                    .map(item => {
                        return <Tooltip title={item.name}>
                            <div className={'h-10 w-10 rounded-lg cursor-pointer border p-2'} key={item.name}>
                                <img key={item.name} src={item.data} alt={item.name}/>
                            </div>
                        </Tooltip>
                    })}
            </div>

            <div>{t('settings.logo.custom')}</div>

            <div>
                <div className={'flex items-center gap-2 flex-wrap'}>
                    {logosQuery.data?.filter(item => item.deletable)
                        .map(item => {
                            return <Popconfirm
                                key={'delete-confirm' + item.name}
                                title={t('general.confirm_delete')}
                                onConfirm={() => {
                                    logoApi.delete(item.name).then(_res => {
                                        logosQuery.refetch();
                                    });
                                }}
                            >
                                <Tooltip title={item.name}>
                                    <div
                                        className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-red-500'}>
                                        <img key={item.name} src={item.data} alt={item.name}/>
                                    </div>
                                </Tooltip>
                            </Popconfirm>
                        })}

                    <Upload
                        accept="image/*" // 只允许上传图片
                        showUploadList={false}
                        customRequest={handleUploadRequest}
                        beforeUpload={beforeUpload}
                        multiple={true}
                    >
                        <div
                            className={'h-10 w-10 rounded-lg cursor-pointer border p-2 border-dashed border-blue-500 flex items-center justify-center'}>
                            <UploadIcon className={'text-blue-500 h-4 w-4'}/>
                        </div>
                    </Upload>
                </div>

            </div>
        </div>
    );
};

export default LogoSetting;

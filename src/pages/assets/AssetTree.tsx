import {useMutation, useQuery} from '@tanstack/react-query';
import {App} from 'antd';
import {useTranslation} from 'react-i18next';
import assetApi from '@/api/asset-api';
import GroupTree from '@/pages/assets/GroupTree';

interface Props {
    selected: string;
    onSelect: (key: string) => void;
}

const AssetTree = ({selected, onSelect}: Props) => {
    const {modal} = App.useApp();
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['assets/tree'],
        queryFn: assetApi.getGroups,
    });
    const saveMutation = useMutation({mutationFn: assetApi.setGroups});
    const deleteMutation = useMutation({
        mutationFn: assetApi.deleteGroup,
        onSuccess: () => query.refetch(),
    });

    return (
        <GroupTree
            data={query.data}
            selected={selected}
            keyPrefix="AG_"
            saving={saveMutation.isPending}
            onSelect={onSelect}
            onSave={data => saveMutation.mutateAsync(data)}
            onDelete={async key => {
                modal.confirm({
                    title: t('general.confirm_delete'),
                    okText: t('actions.delete'),
                    cancelText: t('actions.cancel'),
                    okButtonProps: {danger: true},
                    onOk: () => deleteMutation.mutateAsync(key),
                });
            }}
        />
    );
};

export default AssetTree;

import {useMutation, useQuery} from '@tanstack/react-query';
import {App} from 'antd';
import {useTranslation} from 'react-i18next';
import websiteApi from '@/api/website-api';
import GroupTree from '@/pages/assets/GroupTree';

interface Props {
    selected: string;
    onSelect: (key: string) => void;
}

const WebsiteTree = ({selected, onSelect}: Props) => {
    const {modal} = App.useApp();
    const {t} = useTranslation();
    const query = useQuery({
        queryKey: ['websites/tree'],
        queryFn: websiteApi.getGroups,
    });
    const saveMutation = useMutation({mutationFn: websiteApi.setGroups});
    const deleteMutation = useMutation({
        mutationFn: websiteApi.deleteGroup,
        onSuccess: () => query.refetch(),
    });

    return (
        <GroupTree
            data={query.data}
            selected={selected}
            keyPrefix="WG_"
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

export default WebsiteTree;

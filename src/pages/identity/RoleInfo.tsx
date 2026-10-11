import {Descriptions, Spin, Tree} from "antd";
import roleApi from "../../api/role-api";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {useNTTheme} from "@/hook/use-theme";
import {localizeRoleMenus} from "./role-menu-labels";
import times from "@/components/time/times";

const api = roleApi;

interface RoleInfoProps {
    id: string
}

const RoleInfo = ({id}: RoleInfoProps) => {

    let {t, i18n} = useTranslation();
    let [theme] = useNTTheme();


    let menusQuery = useQuery({
        queryKey: ['menus'],
        queryFn: roleApi.getMenus,
    });

    const roleQuery = useQuery({
        queryKey: ['role', id],
        queryFn: () => api.getById(id),
        enabled: !!id,
    });

    const role = roleQuery.data;
    const roleMenus = role?.menus?.filter(item => item.checked).map(item => item.key) ?? [];

    return (
        <div className={'page-detail-info'}>
            <Spin spinning={roleQuery.isLoading}>
                <Descriptions
                    column={1}
                    items={[
                        {
                            key: 'name',
                            label: t('general.name'),
                            children: role?.name,
                        },
                        {
                            key: 'permission',
                            label: t('identity.role.permission'),
                            children: (() => {
                            if (menusQuery.isLoading) {
                                return <div>{t('general.loading')}</div>
                            }
                            return (
                                <>
                                    {role?.permissionsEditable === false && <p>{t('identity.role.system_permission_notice')}</p>}
                                    <Tree
                                        checkable
                                        disabled={true}
                                        checkedKeys={roleMenus}
                                        treeData={localizeRoleMenus(menusQuery.data ?? [], t, i18n)}
                                        style={{
                                            backgroundColor: theme.backgroundColor,
                                        }}
                                    />
                                </>
                            );
                            })(),
                        },
                        {
                            key: 'created-at',
                            label: t('general.created_at'),
                            children: role?.createdAt ? times.format(role.createdAt) : '-',
                        },
                    ]}
                />
            </Spin>
        </div>
    );
}

export default RoleInfo;

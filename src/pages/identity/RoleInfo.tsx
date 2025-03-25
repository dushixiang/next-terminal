import {Tree} from "antd";
import roleApi, {TreeNode} from "../../api/role-api";
import {useQuery} from "@tanstack/react-query";
import {ProDescriptions} from "@ant-design/pro-components";
import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {useNTTheme} from "@/src/hook/use-theme";
import strings from "@/src/utils/strings";

const api = roleApi;

interface RoleInfoProps {
    id: string
}

const RoleInfo = ({id}: RoleInfoProps) => {

    let {t} = useTranslation();
    let [roleMenus, setRoleMenus] = useState<string[]>([]);
    let [theme] = useNTTheme();


    const wrapGetMenu = async () => {
        let menus = await roleApi.getMenus();
        deepT('', menus);
        return menus;
    }

    const deepT = (parent: string, menus: TreeNode[]) => {
        for (let i = 0; i < menus.length; i++) {
            if (menus[i].isLeaf) {
                menus[i].title = t('permissions.' + menus[i].key);
            } else {
                let parentKey = parent.replaceAll('-', '_');
                let key = menus[i].key.replaceAll('-', '_');
                if (strings.hasText(parent)) {
                    menus[i].title = t(`menus.${parentKey}.submenus.${key}`);
                } else {
                    menus[i].title = t(`menus.${key}.label`);
                }
            }
            if (menus[i].children) {
                deepT(menus[i].key, menus[i].children);
            }
        }
    }

    let menusQuery = useQuery({
        queryKey: ['menus'],
        queryFn: wrapGetMenu,
    });

    const get = async () => {
        let data = await api.getById(id);
        let strings = data.menus?.filter(item => item.checked === true).map(item => item.key);
        setRoleMenus(strings);
        return {
            success: true,
            data: data
        }
    }

    return (
        <div className={'page-detail-info'}>
            <ProDescriptions column={1} request={get}>
                <ProDescriptions.Item label={t('general.name')} dataIndex="name"/>
                <ProDescriptions.Item label={t('identity.role.permission')} dataIndex="menus" render={() => {
                    if (menusQuery.isLoading) {
                        return <div>Loading</div>
                    }
                    return <Tree
                        checkable
                        disabled={true}
                        checkedKeys={roleMenus}
                        treeData={menusQuery.data}
                        style={{
                            backgroundColor: theme.backgroundColor,
                        }}
                    />
                }}>

                </ProDescriptions.Item>
                <ProDescriptions.Item label={t('general.created_at')} dataIndex="createdAt" valueType='dateTime'/>
            </ProDescriptions>
        </div>
    );
}

export default RoleInfo;
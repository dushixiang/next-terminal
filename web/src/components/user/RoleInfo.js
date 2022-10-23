import {Descriptions, Tree} from "antd";

import roleApi from "../../api/role";
import permissionApi from "../../api/permission";
import {useQuery} from "react-query";
import strings from "../../utils/strings";

const api = roleApi;

const RoleInfo = ({active, id}) => {
    let roleQuery = useQuery('roleQuery', () => api.getById(id), {
        enabled: active && strings.hasText(id),
    });
    let menuQuery = useQuery('menuQuery', permissionApi.getMenus, {
        enabled: active && strings.hasText(id),
    });

    let checkedMenuIds = roleQuery.data?.menus
        .filter(item => {
            return item['checked'] === true;
        })
        .map(item => {
            return item['menuId'];
        });

    return (
        <div className={'page-detail-info'}>
            <Descriptions column={1}>
                <Descriptions.Item label="名称">{roleQuery.data?.name}</Descriptions.Item>
                <Descriptions.Item
                    label="类型">{(roleQuery.data?.type === 'default') ? '内置角色' : '用户创建'}</Descriptions.Item>
                <Descriptions.Item label="类型">
                    <Tree
                        checkable
                        disabled={true}
                        checkedKeys={checkedMenuIds}
                        treeData={menuQuery.data}
                    />
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{roleQuery.data?.created}</Descriptions.Item>
            </Descriptions>
        </div>
    );
}

export default RoleInfo;
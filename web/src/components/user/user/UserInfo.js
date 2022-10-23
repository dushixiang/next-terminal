import {Descriptions, Skeleton} from "antd";
import userApi from "../../../api/user";
import {useQuery} from "react-query";
import strings from "../../../utils/strings";

const UserInfo = ({active, userId}) => {

    let userQuery = useQuery('getUserById', () => userApi.getById(userId), {
        enabled: active && strings.hasText(userId),
    });

    let user = userQuery.data || {};

    if (userQuery.isLoading) {
        return (<div className={'page-detail-info'}>
            <Skeleton/>
        </div>)
    }

    return (
        <div className={'page-detail-info'}>
            <Descriptions title="基本信息" column={1}>
                <Descriptions.Item label="用户名">{user['username']}</Descriptions.Item>
                <Descriptions.Item label="昵称">{user['nickname']}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{user['mail']}</Descriptions.Item>
                <Descriptions.Item label="状态">{user['status'] === 'enabled' ? '开启' : '关闭'}</Descriptions.Item>
                <Descriptions.Item label="双因素认证">{user['totpSecret']}</Descriptions.Item>
                <Descriptions.Item label="来源">{user['source'] === 'ldap' ? 'LDAP' : '数据库'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{user['created']}</Descriptions.Item>
            </Descriptions>
        </div>
    );
};

export default UserInfo;
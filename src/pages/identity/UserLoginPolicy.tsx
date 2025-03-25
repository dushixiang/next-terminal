import React, {useEffect, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import loginPolicyApi from "../../api/login-policy-api";
import {TransferDirection} from "antd/es/transfer";
import {Transfer} from "antd";
import {useTranslation} from "react-i18next";

interface UserInfoProps {
    active: boolean
    userId: string
}

const UserLoginPolicy = ({active, userId}: UserInfoProps) => {
    let {t} = useTranslation();
    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    let loginPolicyQuery = useQuery({
        queryKey: ['loginPolicy'],
        queryFn: loginPolicyApi.getAll,
    });

    let selectedKeysQuery = useQuery({
        queryKey: ['login-policy-id'],
        queryFn: () => loginPolicyApi.getLoginPolicyIdByUserId(userId)
    });

    useEffect(() => {
        if (selectedKeysQuery.data) {
            setTargetKeys(selectedKeysQuery.data)
        }
    }, [selectedKeysQuery.data]);

    if (loginPolicyQuery.isLoading) {
        return <div>Loading...</div>
    }

    let items = loginPolicyQuery.data?.map(item => {
        return {
            key: item.id,
            title: item.name,
            priority: item.priority,
        }
    });

    const onChange = async (nextTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
        switch (direction) {
            case 'left':
                await loginPolicyApi.unbindLoginPolicy(userId, moveKeys);
                break;
            case 'right':
                await loginPolicyApi.bindLoginPolicy(userId, moveKeys);
                break;
        }
        setTargetKeys(nextTargetKeys);
    };

    return (
        <Transfer
            dataSource={items}
            titles={[t('general.unbound'), t('general.bound')]}
            operations={[t('actions.binding'), t('actions.unbind')]}
            showSearch
            listStyle={{
                width: 250,
                height: 400,
            }}
            targetKeys={targetKeys}
            onChange={onChange}
            render={(item) => item.title + `(${item.priority})`}
        />
    );
};

export default UserLoginPolicy;
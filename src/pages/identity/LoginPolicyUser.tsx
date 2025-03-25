import React, {useEffect, useState} from 'react';
import {Transfer} from "antd";
import {TransferDirection} from "antd/es/transfer";
import {useQuery} from "@tanstack/react-query";
import userApi from "../../api/user-api";
import loginPolicyApi from "../../api/login-policy-api";
import {useTranslation} from "react-i18next";


const LoginPolicyUser = ({id}: any) => {
    let {t} = useTranslation();
    const [targetKeys, setTargetKeys] = useState<string[]>([]);

    let usersQuery = useQuery({
        queryKey: ['user'],
        queryFn: userApi.getAll,
    });

    let selectedKeysQuery = useQuery({
        queryKey: ['user-id'],
        queryFn: () => loginPolicyApi.getUserId(id)
    });

    useEffect(() => {
        if (selectedKeysQuery.data) {
            setTargetKeys(selectedKeysQuery.data)
        }
    }, [selectedKeysQuery.data]);

    if (usersQuery.isLoading) {
        return <div>Loading...</div>
    }

    let items = usersQuery.data?.map(item => {
        return {
            key: item.id,
            title: item.nickname,
        }
    });

    const onChange = async (nextTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
        switch (direction){
            case 'left':
                await loginPolicyApi.unbindUser(id, moveKeys);
                break;
            case 'right':
                await loginPolicyApi.bindUser(id, moveKeys);
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
            render={(item) => item.title}
        />
    );
};

export default LoginPolicyUser;
import React from 'react';
import {Button, Descriptions, Space, Typography} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import accountApi from "@/api/account-api";
import times from "@/components/time/times";

const AccessToken = () => {
    let {t} = useTranslation();

    let tokenQuery = useQuery({
        queryKey: ['access-token'],
        queryFn: accountApi.getAccessToken,
    });

    let tokenMutation = useMutation({
        mutationFn: accountApi.createAccessToken,
        onSuccess: () => {
            tokenQuery.refetch();
        }
    });

    return (
        <div className={'space-y-4'}>
            <Typography.Title level={5} style={{marginTop: 0}}>{t('account.access_token')}</Typography.Title>
            <Descriptions column={1}>
                <Descriptions.Item label={t('account.access_token')}>
                    <Typography.Text strong copyable>{tokenQuery.data?.id}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label={t('general.created_at')}>
                    <Typography.Text strong>{times.format(tokenQuery.data?.createdAt)}</Typography.Text>
                </Descriptions.Item>
            </Descriptions>

            <Space>
                <Button type="primary" onClick={() => tokenMutation.mutate()}
                        loading={tokenMutation.isPending}>
                    {t('account.regen')}
                </Button>
            </Space>
        </div>
    );
};

export default AccessToken;
import React, {useEffect, useRef} from 'react';
import {message} from "antd";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useNavigate, useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import assetApi from "@/api/asset-api";
import AssetsPost, {AssetsPostRef} from "@/pages/assets/AssetPost";

const AssetInfo = () => {
    const {assetId} = useParams();
    const {t} = useTranslation();
    const navigate = useNavigate();
    const assetsPostRef = useRef<AssetsPostRef>(null);

    useEffect(() => {
        if (!assetId) {
            navigate('/asset');
        }
    }, [assetId, navigate]);

    const assetQuery = useQuery({
        queryKey: ['asset-info', assetId],
        queryFn: () => assetApi.getById(assetId || ''),
        enabled: !!assetId,
    });

    const assetProtocol = assetQuery.data?.protocol || '';
    const wolEnabled = assetQuery.data?.attrs?.['wol-enabled'] === 'true' || assetQuery.data?.attrs?.['wol-enabled'] === true;

    const detectOSMutation = useMutation({
        mutationFn: async () => {
            if (!assetId) {
                return;
            }
            await assetApi.detectOS(assetId);
            await assetsPostRef.current?.refreshLogo();
            await assetQuery.refetch();
        },
        onSuccess: () => {
            message.success(t('assets.detect_os_success'));
        },
        onError: (e: any) => {
            message.error(e?.message || t('assets.detect_os_failed'));
        }
    });

    const wolMutation = useMutation({
        mutationFn: async () => {
            if (!assetId) {
                return;
            }
            await assetApi.wol(assetId);
        },
        onSuccess: () => {
            message.success(t('assets.wol_send_success'));
        },
        onError: (e: any) => {
            message.error(e?.message || t('assets.wol_send_failed'));
        }
    });

    return (
        <div>
            <AssetsPost
                ref={assetsPostRef}
                assetId={assetId}
                canDetectOS={assetProtocol === 'ssh'}
                detectOSLoading={detectOSMutation.isPending}
                onDetectOS={() => detectOSMutation.mutate()}
                canWOL={wolEnabled}
                wolLoading={wolMutation.isPending}
                onWOL={() => wolMutation.mutate()}
                onSuccess={() => {
                    assetQuery.refetch();
                }}
            />
        </div>
    );
};

export default AssetInfo;

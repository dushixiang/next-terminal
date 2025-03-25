import React from 'react';
import {Spin} from "antd";
import brandingApi from "../api/branding-api";
import {useQuery} from "@tanstack/react-query";

const FooterComponent = () => {

    let brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    return (
        <Spin spinning={brandingQuery.isLoading}>
            <div className={'py-8 px-4 text-center text-sm'}>
                {brandingQuery.data?.name}｜{brandingQuery.data?.copyright}｜{brandingQuery.data?.version}
            </div>
        </Spin>
    );
}

export default FooterComponent;
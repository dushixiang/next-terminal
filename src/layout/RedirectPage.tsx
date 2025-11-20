import React, {useEffect} from 'react';
import Landing from "@/components/Landing";
import {useNavigate} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import accountApi from "@/api/account-api";
import {isMobileByMediaQuery} from "@/utils/utils";

const RedirectPage = () => {

    let navigate = useNavigate();

    let infoQuery = useQuery({
        queryKey: ['infoQuery'],
        queryFn: () => {
            return accountApi.getUserInfo()
        },
    });

    useEffect(() => {
        if (!infoQuery.data) {
            return
        }

        let isMobile = isMobileByMediaQuery();
        if (isMobile) {
            navigate('/x-asset');
            return;
        }

        let data = infoQuery.data;
        if (data.type === 'user') {
            navigate('/x-asset');
        } else {
            navigate('/dashboard');
        }
    }, [infoQuery.data]);

    return (
        <div>
            <Landing/>
        </div>
    );
};

export default RedirectPage;
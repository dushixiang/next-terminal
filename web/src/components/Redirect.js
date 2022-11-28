import React from 'react';
import {useQuery} from "react-query";
import accountApi from "../api/account";
import {setCurrentUser} from "../service/permission";
import {useNavigate} from "react-router-dom";
import Landing from "./Landing";

const Redirect = () => {

    let navigate = useNavigate();

    let infoQuery = useQuery('infoQuery', accountApi.getUserInfo, {
        onSuccess: data => {
            setCurrentUser(data);
            if (data.type === 'user') {
                navigate('/my-asset');
            } else if (data.type === 'admin'){
                navigate('/dashboard');
            }
        }
    });

    return (
        <div>
            <Landing/>
        </div>
    );
};

export default Redirect;
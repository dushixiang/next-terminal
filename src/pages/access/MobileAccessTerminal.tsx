import React from 'react';
import {useSearchParams} from "react-router-dom";
import strings from "@/src/utils/strings";
import AccessTerminal from "@/src/pages/access/AccessTerminal";

const MobileAccessTerminal = () => {

    let [searchParams] = useSearchParams();
    let assetId = searchParams.get('assetId');

    if (!strings.hasText(assetId)) {
        return <div>
            Error
        </div>
    }

    return (
        <div>
            <AccessTerminal assetId={assetId}/>
        </div>
    );
};

export default MobileAccessTerminal;
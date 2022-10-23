import React, {useEffect, useState} from 'react';
import {Layout} from "antd";
import {NT_PACKAGE} from "../utils/utils";
import brandingApi from "../api/branding";

const {Footer} = Layout;

let _package = NT_PACKAGE();

const FooterComponent = () => {

    let [branding, setBranding] = useState({});

    useEffect(() => {
        const x = async () => {
            let branding = await brandingApi.getBranding();
            document.title = branding['name'];
            setBranding(branding);
        }
        x();
    }, []);

    return (
        <Footer style={{textAlign: 'center'}}>
            {branding['copyright']} Version:{_package['version']}
        </Footer>
    );
}

export default FooterComponent;
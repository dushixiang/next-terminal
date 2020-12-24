import axios from 'axios'
import {prefix, server} from "./constants";
import {message} from 'antd';
import {getHeaders} from "../utils/utils";

// 测试地址
// axios.defaults.baseURL = server;
// 线上地址
axios.defaults.baseURL = server + prefix;

const handleError = (error) => {
    if ("Network Error" === error.toString()) {
        message.error('网络异常');
        return;
    }
    if (error.response !== undefined && error.response.status === 403) {
        window.location.href = '#/login';
        return;
    }
    if (error.response !== undefined) {
        // message.error(error.response.data.message);
    }
};

const handleResult = (result) => {
    if (result['code'] === 403) {
        window.location.href = '#/login';
    }
}

const request = {

    get: function (url) {
        const headers = getHeaders();

        return new Promise((resolve, reject) => {
            axios.get(url, {headers: headers})
                    .then((response) => {
                        handleResult(response.data);
                        resolve(response.data);
                    })
                    .catch((error) => {
                        handleError(error);
                        reject(error);
                    });
        })
    },

    post: function (url, params) {

        const headers = getHeaders();

        return new Promise((resolve, reject) => {
            axios.post(url, params, {headers: headers})
                    .then((response) => {
                        handleResult(response.data);
                        resolve(response.data);
                    })
                    .catch((error) => {
                        handleError(error);
                        reject(error);
                    });
        })
    },

    put: function (url, params) {

        const headers = getHeaders();

        return new Promise((resolve, reject) => {
            axios.put(url, params, {headers: headers})
                    .then((response) => {
                        handleResult(response.data);
                        resolve(response.data);
                    })
                    .catch((error) => {
                        handleError(error);
                        reject(error);
                    });
        })
    },

    delete: function (url) {
        const headers = getHeaders();

        return new Promise((resolve, reject) => {
            axios.delete(url, {headers: headers})
                    .then((response) => {
                        handleResult(response.data);
                        resolve(response.data);
                    })
                    .catch((error) => {
                        handleError(error);
                        reject(error);
                    });
        })
    },

    patch: function (url, params) {
        const headers = getHeaders();

        return new Promise((resolve, reject) => {
            axios.patch(url, params, {headers: headers})
                    .then((response) => {
                        handleResult(response.data);
                        resolve(response.data);
                    })
                    .catch((error) => {
                        handleError(error);
                        reject(error);
                    });
        })
    },
};
export default request

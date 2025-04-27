import eventEmitter from "@/src/api/core/event-emitter";

export const baseUrl = () => {
    if (import.meta.env.DEV) {
        return 'http://localhost/api';
    }
    return window.location.protocol + '//' + window.location.host + '/api';
}

export const baseWebSocketUrl = () => {
    if (import.meta.env.DEV) {
        return 'ws://localhost/api';
    }
    let https = 'https:' == document.location.protocol;
    if (https) {
        return 'wss://' + window.location.host + '/api';
    } else {
        return 'ws://' + window.location.host + '/api';
    }
}

const Token = 'X-Auth-Token';

export const getToken = () => {
    return localStorage.getItem(Token) || "";
}

export const setToken = (token: string) => {
    localStorage.setItem(Token, token);
}

export const removeToken = () => {
    localStorage.removeItem(Token);
}

const handleError = async (error: any, url?: string) => {
    if (error instanceof TypeError) {
        switch (error.message) {
            case 'Failed to fetch':
                eventEmitter.emit("NETWORK:UN_CONNECT");
                break;
        }
        return;
    }
    console.error(`error`, error)
    if (error.status === 418) {
        eventEmitter.emit("API:REDIRECT", "/setup");
        return;
    }
    if (error.status === 401) {
        eventEmitter.emit("API:UN_AUTH");
        return;
    }
    let response = error.response;
    let msg = '';
    let errorCode = 0;
    if (response?.headers.get('Content-Type')?.includes('application/json')) {
        let data = await response?.json();
        msg = data['message'];
        errorCode = data['code'];
    } else {
        msg = error.response?.text();
    }

    let noerr = url?.includes('noerr');
    if (!noerr) {
        eventEmitter.emit("API:VALIDATE_ERROR", errorCode, msg);
    }
    return Promise.reject({
        status: error.status,
        statusText: error.statusText,
        message: msg,
        code: errorCode,
    })
}

const handleResponse = (response: Response) => {
    if (response.ok) {
        if (response.headers.get('Content-Type')?.includes('application/json')) {
            return response.json();
        }
        return response.text();
    } else {
        return Promise.reject({
            status: response.status,
            statusText: response.statusText,
            response: response
        })
    }
}

class request {
    async get(url: string) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "GET",
            headers: {
                'X-Auth-Token': token
            }
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async post(url: string, body?: any | undefined) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "POST",
            headers: {
                'content-type': 'application/json',
                'X-Auth-Token': token
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async postForm(url: string, body?: any | undefined) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "POST",
            headers: {
                // 'content-type': 'multipart/form-data',
                'X-Auth-Token': token,
            },
            body: body,
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async put(url: string, body?: any | undefined) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "PUT",
            headers: {
                'content-type': 'application/json',
                'X-Auth-Token': token
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async patch(url: string, body?: any | undefined) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "PATCH",
            headers: {
                'content-type': 'application/json',
                'X-Auth-Token': token
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async delete(url: string) {
        let token = getToken();
        return fetch(baseUrl() + url, {
            method: "DELETE",
            headers: {
                'X-Auth-Token': token
            }
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }
}

let requests = new request();

export default requests;
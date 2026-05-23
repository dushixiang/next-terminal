import eventEmitter from "@/api/core/event-emitter";

export const baseUrl = () => {
    return '/api';
}

export const baseWebSocketUrl = () => {
    let https = 'https:' == document.location.protocol;
    if (https) {
        return 'wss://' + window.location.host + '/api';
    } else {
        return 'ws://' + window.location.host + '/api';
    }
}

// 清理 localStorage 中的残留 token
localStorage.removeItem('X-Auth-Token');

const handleError = async (error: any, url?: string) => {
    if (error instanceof TypeError) {
        switch (error.message) {
            case 'Failed to fetch':
                eventEmitter.emit("NETWORK:UN_CONNECT");
                break;
        }
        return;
    }

    let noerr = url?.includes('noerr');

    if (!noerr && error.status === 418) {
        eventEmitter.emit("API:REDIRECT", "/setup");
        return Promise.reject({
            status: error.status,
            statusText: error.statusText,
            message: 'Redirect to setup',
            code: 418,
        });
    }
    if (!noerr && error.status === 401) {
        eventEmitter.emit("API:UN_AUTH");
        return Promise.reject({
            status: error.status,
            statusText: error.statusText,
            message: 'Unauthorized',
            code: 401,
        });
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
        return fetch(baseUrl() + url, {
            method: "GET",
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async post(url: string, body?: any | undefined) {
        return fetch(baseUrl() + url, {
            method: "POST",
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async postForm(url: string, body?: any | undefined) {
        return fetch(baseUrl() + url, {
            method: "POST",
            body: body,
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async put(url: string, body?: any | undefined) {
        return fetch(baseUrl() + url, {
            method: "PUT",
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async patch(url: string, body?: any | undefined) {
        return fetch(baseUrl() + url, {
            method: "PATCH",
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }

    async delete(url: string) {
        return fetch(baseUrl() + url, {
            method: "DELETE",
        }).then(response => {
            return handleResponse(response);
        }).catch(async error => {
            return await handleError(error, url);
        })
    }
}

let requests = new request();

export default requests;

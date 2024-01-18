import axios from 'axios';
import { server } from './env';
import { message } from 'antd';
import { getHeaders } from '../utils/utils';

// 测试地址
// axios.defaults.baseURL = server;
// 线上地址
axios.defaults.baseURL = server;

const handleError = (error) => {
  if ('Network Error' === error.toString()) {
    message.error('网络异常');
    return false;
  }
  if (error.response !== undefined && error.response.status === 401) {
    window.location.href = '#/login';
    return false;
  }
  if (error.response !== undefined) {
    message.error(error.response.data.message);
    return false;
  }
  return true;
};

const handleResult = (result) => {
  if (result['code'] === 401) {
    window.location.href = '#/login';
    return false;
  }
  if (result['code'] === 403) {
    window.location.href = '#/permission-denied';
    return false;
  } else if (result['code'] === 100) {
    return true;
  } else if (result['code'] !== 1) {
    message.error(result['message']);
    return false;
  }
  return true;
};

const request = {
  get: function (url) {
    const headers = getHeaders();

    return new Promise((resolve, reject) => {
      fetch(url, { headers })
        .then((response) => {
          let contentType = response.headers.get('content-type');
          if (contentType !== '' && contentType.includes('application/json')) {
            return response.json();
          }
          return response.text();
        })
        .then((result) => {
          if (typeof result === 'object') {
            handleResult(result);
          }
          resolve(result);
        })
        .catch((error) => {
          if (!handleError(error)) {
            return;
          }
          reject(error);
        });
    });
  },

  post: function (url, params, header) {
    const headers = getHeaders();
    if (header) {
      for (const k in header) {
        headers[k] = header[k];
      }
    }

    return new Promise((resolve, reject) => {
      axios
        .post(url, params, { headers: headers })
        .then((response) => {
          handleResult(response.data);
          resolve(response.data);
        })
        .catch((error) => {
          if (!handleError(error)) {
            return;
          }
          reject(error);
        });
    });
  },

  put: function (url, params) {
    const headers = getHeaders();

    return new Promise((resolve, reject) => {
      axios
        .put(url, params, { headers: headers })
        .then((response) => {
          handleResult(response.data);
          resolve(response.data);
        })
        .catch((error) => {
          if (!handleError(error)) {
            return;
          }
          reject(error);
        });
    });
  },

  delete: function (url) {
    const headers = getHeaders();

    return new Promise((resolve, reject) => {
      axios
        .delete(url, { headers: headers })
        .then((response) => {
          handleResult(response.data);
          resolve(response.data);
        })
        .catch((error) => {
          if (!handleError(error)) {
            return;
          }
          reject(error);
        });
    });
  },

  patch: function (url, params) {
    const headers = getHeaders();

    return new Promise((resolve, reject) => {
      axios
        .patch(url, params, { headers: headers })
        .then((response) => {
          handleResult(response.data);
          resolve(response.data);
        })
        .catch((error) => {
          if (!handleError(error)) {
            return;
          }
          reject(error);
        });
    });
  },
};
export default request;

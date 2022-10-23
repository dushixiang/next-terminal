import strings from "../utils/strings";
import {useState} from "react";

class columnState {
    ASSET = 'cs-asset';
    CREDENTIAL = 'cs-credential';
    COMMAND = 'cs-command';
    ACCESS_GATEWAY = 'cs-access-gateway';
    ONLINE_SESSION = 'cs-online-session';
    OFFLINE_SESSION = 'cs-offline-session';
    LOGIN_LOG = 'cs-login-log';
    STORAGE_LOG = 'cs-storage-log';
    JOB = 'cs-job';
    STORAGE = 'cs-storage';
    LOGIN_POLICY = 'cs-login-policy';
    ACCESS_SECURITY = 'cs-access-security';
    USER = 'cs-user';
    ROLE = 'cs-role';
    USER_GROUP = 'cs-user-group';
    COMMAND_FILTER = 'cs-command-filter';
    STRATEGY = 'cs-strategy';
}

let ColumnState = new columnState();

export default ColumnState;

export const useColumnState = (key) => {
    let [columnsStateMap, setColumnsStateMap] = useState(getColumnState(key));
    const set = (value) => {
        new Promise((resolve) => {
            setColumnsStateMap(value);
            resolve(value);
        }).then(res => {
            setColumnState(key, res);
        });
    }
    return [columnsStateMap, set];
}

const getColumnState = (key) => {
    switch (key) {
        case ColumnState.ASSET:
            return getValueOrDefault(key, {});
        case ColumnState.CREDENTIAL:
            return getValueOrDefault(key, {});
        case ColumnState.COMMAND:
            return getValueOrDefault(key, {});
        case ColumnState.ACCESS_GATEWAY:
            return getValueOrDefault(key, {});
        case ColumnState.ONLINE_SESSION:
            return getValueOrDefault(key, {});
        case ColumnState.OFFLINE_SESSION:
            return getValueOrDefault(key, {});
        default:
            return getValueOrDefault(key, {});
    }
}

const setColumnState = (key, columnState) => {
    localStorage.setItem(key, JSON.stringify(columnState))
}

const getValueOrDefault = (key, defaultValue) => {
    let item = localStorage.getItem(key);
    if (strings.hasText(item)) {
        try {
            return JSON.parse(item);
        } catch (e) {
            return defaultValue;
        }
    } else {
        return defaultValue;
    }
}
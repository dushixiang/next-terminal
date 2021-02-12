// prod
// let wsPrefix;
// if (window.location.protocol === 'https:') {
//     wsPrefix = 'wss:'
// } else {
//     wsPrefix = 'ws:'
// }
//
// export const server = '';
// export const wsServer = wsPrefix + window.location.host;
// export const prefix = window.location.protocol + '//' + window.location.host;

// dev
export const server = '//127.0.0.1:8088';
export const wsServer = 'ws://127.0.0.1:8088';
export const prefix = '';

export const PROTOCOL_COLORS = {
    'rdp': 'red',
    'ssh': 'blue',
    'telnet': 'geekblue',
    'vnc': 'purple'
}
function env() {
    if (process.env.REACT_APP_ENV === 'development') {
        // 本地开发环境
        return {
            server: '//127.0.0.1:8088',
            wsServer: 'ws://127.0.0.1:8088',
            prefix: '',
        }
    } else {
        // 生产环境
        let apiUrl = new URL('api', window.location.href).href;
        let wsPrefix, server = apiUrl.substring(window.location.protocol.length, apiUrl.indexOf('/api'));
        
        if (window.location.protocol === 'https:') {
            wsPrefix = 'wss:'
        } else {
            wsPrefix = 'ws:'
        }
        return {
            server: server,
            wsServer: wsPrefix + server,
            prefix: window.location.protocol + '//' + server,
        }
    }
}
export default env();

export const server = env().server;
export const wsServer = env().wsServer;
export const prefix = env().prefix;
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = function override(config, env) {
    config.plugins.push(new MonacoWebpackPlugin({
        languages: ['json']
    }));
    return config;
}
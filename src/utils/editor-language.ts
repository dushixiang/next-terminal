export function getLanguageFromFileName(fileName: string): string {
    const lower = fileName.toLowerCase();
    const extension = lower.split('.').pop();

    if (!extension) {
        if (lower === 'dockerfile') return 'dockerfile';
        return 'plaintext';
    }

    const map: Record<string, string> = {
        // Web / scripts
        'html': 'html',
        'htm': 'html',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'json': 'json',
        'jsonc': 'json',
        'xml': 'xml',
        'svg': 'xml',
        'yml': 'yaml',
        'yaml': 'yaml',
        'md': 'markdown',
        'markdown': 'markdown',

        // Programming languages
        'go': 'go',
        'php': 'php',
        'java': 'java',
        'py': 'python',
        'rb': 'ruby',
        'rs': 'rust',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'c': 'c',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'swift': 'swift',
        'kt': 'kotlin',
        'kts': 'kotlin',
        'r': 'r',

        // Shell / config
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'ps1': 'powershell',
        'bat': 'bat',
        'cmd': 'bat',
        'ini': 'ini',
        'conf': 'ini',
        'cfg': 'ini',
        'properties': 'ini',
        'env': 'shell',
        'toml': 'ini',

        // Data / DB
        'sql': 'sql',
        'mysql': 'sql',
        'pgsql': 'sql',
        'csv': 'plaintext',
        'log': 'plaintext',
        'txt': 'plaintext',

        // Devops
        'dockerfile': 'dockerfile',
        'docker': 'dockerfile',
        'graphql': 'graphql',
        'gql': 'graphql',
    };

    return map[extension] || extension || 'plaintext';
}



export const getImgColor = (protocol: string) => {
    switch (protocol) {
        case 'rdp':
            return `bg-purple-500`;
        case 'ssh':
            return `bg-green-500`;
        case 'telnet':
            return `bg-rose-500`;
        case 'vnc':
            return `bg-amber-500`;
        case 'kubernetes':
            return `bg-rose-500`;
        case 'http':
            return `bg-orange-500`;
    }
}

export const getProtocolColor = (protocol: string) => {
    switch (protocol) {
        case 'rdp':
            return `bg-purple-400`;
        case 'ssh':
            return `bg-green-400`;
        case 'telnet':
            return `bg-rose-400`;
        case 'vnc':
            return `bg-amber-400`;
        case 'kubernetes':
            return `bg-rose-400`;
        case 'http':
            return `bg-orange-400`;
    }
}
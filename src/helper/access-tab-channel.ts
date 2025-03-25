const channel = new BroadcastChannel('access-tab-sync');

export interface AccessTabSyncMessage {
    id: string;
    name: string;
    protocol: string;
}

export const accessAsset = (message: AccessTabSyncMessage) => {
    channel.postMessage(message);
};

// const handler = (event: MessageEvent) => {
//     let message = event.data as AccessTabSyncMessage;
//
// };

// export const listenAccessAsset = (callback: (message: AccessTabSyncMessage) => void) => {
//     channel.addEventListener('message', (event)=>{
//         callback && callback(event.data as AccessTabSyncMessage);
//     });
// };
//
// export const unListenAccessAsset = () => {
//     channel.removeEventListener('message', handler);
// };
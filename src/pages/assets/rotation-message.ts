import type {TFunction} from 'i18next';

const fixedMessages: Record<string, string> = {
    'only SSH assets are supported': 'assets.rotation.messages.only_ssh',
    'account type does not match rotation type': 'assets.rotation.messages.account_type_mismatch',
    'rotation aborted': 'assets.rotation.messages.aborted',
    'shared credential rotation aborted; old key remains active': 'assets.rotation.messages.shared_aborted',
};

const detailMessages = [
    ['cannot derive old public key: ', 'assets.rotation.messages.old_key_invalid'],
    ['public key updated on remote host but failed to save to database, please check immediately: ', 'assets.rotation.messages.database_save_failed'],
    ['new key saved, but old key revocation failed: ', 'assets.rotation.messages.old_key_removal_failed'],
] as const;

/** 只翻译系统定义的结果，远端错误详情及未知消息保持原文。 */
export const rotationMessage = (message: string | undefined, t: TFunction): string | undefined => {
    if (!message) return message;
    if (Object.prototype.hasOwnProperty.call(fixedMessages, message)) return t(fixedMessages[message]);
    for (const [prefix, key] of detailMessages) {
        if (message.startsWith(prefix)) {
            return t(key, {detail: message.slice(prefix.length)});
        }
    }
    return message;
};

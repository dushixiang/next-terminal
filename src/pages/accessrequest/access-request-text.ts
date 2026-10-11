/** 仅映射系统自动关闭时写入的固定原因，审批人输入和未知原因保留原文。 */
export const accessRequestReason = (status: string, reason: string | undefined, t: (key: string) => string) => {
    if (status === 'closed' && reason === 'existing_authorization') {
        return t('access_request.closed_existing_authorization');
    }
    return reason;
};

const weekMapping = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 0: '日',
}

export const renderWeekDay = (d) => {
    return '星期' + weekMapping[d];
}
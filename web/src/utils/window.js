export const openTinyWin = function (url, name, width, height) {
    //获得窗口的垂直位置
    const top = (window.screen.availHeight - 30 - height) / 2;
    //获得窗口的水平位置
    const left = (window.screen.availWidth - 10 - width) / 2;
    window.open(url, name, `height=${height},innerHeight=${height},width=${width},innerWidth=${width},top='${top},left=${left},status=no,toolbar=no,menubar=no,location=no,resizable=no,scrollbars=0,titlebar=no`);
}
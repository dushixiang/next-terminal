export const xtermScrollPretty = () => {
    let viewports = document.getElementsByClassName('xterm-viewport');
    for (let i = 0; i < viewports.length; i++) {
        let viewport = viewports[i];
        let timer;
        viewport.addEventListener('scroll', function (ev) {
            viewport.toggleAttribute('scroll', true)
            timer && clearTimeout(timer)
            timer = setTimeout(() => {
                viewport.toggleAttribute('scroll')
            }, 500);
        });
    }
}
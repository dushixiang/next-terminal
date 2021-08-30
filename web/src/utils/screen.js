
const FullScreen = {
  enter() {
    const element = document.documentElement;
    const enterMethod =
      element.requestFullScreen ||
      element.webkitRequestFullScreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullScreen;

    if (enterMethod) {
      enterMethod.call(element);
    } else if (typeof window.ActiveXObject !== 'undefined') {
      const wscript = new window.ActiveXObject('WScript.Shell');
      if (wscript !== null) {
        wscript.SendKeys('{F11}');
      }
    }
  },
  exit() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozExitFullScreen) {
      document.mozExitFullScreen();
    } else if (document.webkitExitFullScreen) {
      document.webkitExitFullScreen();
    } else if (typeof window.ActiveXObject !== 'undefined') {
      const wscript = new window.ActiveXObject('WScript.Shell');
      if (wscript !== null) {
        wscript.SendKeys('{F11}');
      }
    }
  },
  isFullScreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullScreenElement ||
      document.mozFullScreenElement ||
      document.msFullScreenElement
    );
  },
  onFullScreenChange(callBack) {
    console.log(' ----- ===== full screen changed ');

    document.onfullscreenchange = callBack;
    document.onwebkitfullscreenchange = callBack;
    document.onmozfullscreenchange = callBack;
    document.momsfullscreenchange = callBack;
  },
  toggle() {
    if (this.isFullScreen()) {
      this.exit();
    } else {
      this.enter();
    }
  },
};

export default FullScreen;

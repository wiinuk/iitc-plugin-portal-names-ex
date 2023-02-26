// @ts-check
(() => {
    let unused1 = null;
    function unused2() {
        unused1 = Math.random();
    }
    let used1 = null;
    function used2() {
        used1 = Math.random();
    }
    used2();
})();

// @ts-check
(() => {
    let used1 = null;
    function used2() {
        used1 = Math.random();
    }
    used2();
})();

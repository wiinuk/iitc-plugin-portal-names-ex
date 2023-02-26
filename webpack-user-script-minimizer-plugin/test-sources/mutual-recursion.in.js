// @ts-check

(() => {
    function unused1() {
        unused2();
    }
    function unused2() {
        unused1();
    }
    console.log();
})();

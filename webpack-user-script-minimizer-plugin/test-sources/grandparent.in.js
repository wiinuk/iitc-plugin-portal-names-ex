// @ts-check

(() => {
    function unused1() {
        console.log();
    }
    function unused2() {
        unused1();
    }
    function used1() {
        console.log();
    }
    function used2() {
        used1();
    }
    used2();
})();

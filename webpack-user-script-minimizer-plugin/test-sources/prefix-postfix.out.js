// @ts-check
(() => {
    let used1 = Math.random();
    const unused1 = ++used1;
    let used2 = Math.random();
    const unused2 = used2++;
    let used3 = Math.random();
    console.log(used1, used2);
})();
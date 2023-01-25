// @ts-check
(() => {
    var unused1 = { f: 123 };
    var unused2 = { unused1 };
    var used1 = [123];
    var used2 = [used1];
    console.log(used2);
})();

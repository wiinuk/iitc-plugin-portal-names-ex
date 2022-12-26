import {
    record,
    string,
    number,
    or,
    literal,
    array,
    enumNumbers,
    and,
} from "./json-spec";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assert = <_T extends true>() => {
    /* 型レベルアサーション関数 */
};
type eq<a, b> = [a] extends [b] ? ([b] extends [a] ? true : false) : false;

describe("record.validate { name: { first: string, last: string }, age: number }", () => {
    const Spec_ = record({
        name: record({ first: string, last: string }),
        age: number,
    });
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = { name: { first: "a", last: "b" }, age: 123 };
        Spec.validate(x);
        assert<
            eq<typeof x, { name: { first: string; last: string }; age: number }>
        >();
    });
    it("エラー", () => {
        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*{ name: { first: string, last: string }, age: number })(?=.*\$)(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*{ name: { first: string, last: string }, age: number })(?=.*\$)(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(/^(?=.*"name")(?=.*\$)/);
        expect(() =>
            Spec.validate({ name: { first: "a", last: "b" } })
        ).toThrow(/^(?=.*"age")(?=.*\$)/);
        expect(() => Spec.validate({ age: 123 })).toThrow(
            /^(?=.*"name")(?=.*\$)/
        );
        expect(() => Spec.validate({ name: "aaa", age: 123 })).toThrow(
            /^(?=.*{ first: string, last: string })(?=.*\$\.name)(?=.*"aaa")/
        );
        expect(() => Spec.validate([1, 2, 3])).toThrow(/^(?=.*"name")(?=.*\$)/);
    });
});
describe("array.validate number[]", () => {
    const Spec_ = array(number);
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = [1, 2, 3];
        Spec.validate(x);
        assert<eq<typeof x, number[]>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*number\[\])(?=.*\$)(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*number\[\])(?=.*\$)(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(
            /^(?=.*number\[\])(?=.*\$)(?=.*\{\})/
        );
    });
});
describe("or.validate (string | number)", () => {
    const Spec_ = or(string, number);
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = "aaa";
        Spec.validate(x);
        assert<eq<typeof x, string | number>>();
    });
    it("成功2", () => {
        const x: unknown = 123;
        Spec.validate(x);
        assert<eq<typeof x, string | number>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*string \| number(?=.*\$))(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*string \| number(?=.*\$))(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(/^(?=.*\$)(?=.*\{\})/);
        expect(() => Spec.validate({ age: 123 })).toThrow(
            /^(?=.*\$)(?=.*\{\s*"age":\s*123\s*\})/
        );
    });
});
describe("and.validate ({ x: number } & { y: number })", () => {
    const Spec_ = and(record({ x: number }), record({ y: number }));
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = { x: 1, y: 2 };
        Spec.validate(x);
        assert<eq<typeof x, { x: number } & { y: number }>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate({ x: 1 })).toThrow(/^(?=.*\$)(?=.*"y")/);
        expect(() => Spec.validate({ y: 2 })).toThrow(/^(?=.*\$)(?=.*"x")/);

        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*{ x: number })(?=.*\$)(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*{ x: number })(?=.*\$)(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(/^(?=.*\$)(?=.*"x")/);
    });
});
describe("and,or ({ x: number } & ({ a: number } | { b: number }))", () => {
    const Spec_ = and(
        record({ x: number }),
        or(record({ a: number }), record({ b: number }))
    );
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = { x: 1, a: 2 };
        Spec.validate(x);
        assert<eq<typeof x, { x: number } & ({ a: number } | { b: number })>>();
    });
    it("成功2", () => {
        const x: unknown = { x: 1, b: 2 };
        Spec.validate(x);
        assert<eq<typeof x, { x: number } & ({ a: number } | { b: number })>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate({ x: 1 })).toThrow(
            /^(?=.*\$)(?=.*\({ a: number } | { b: number }\))(?=.*{\s*"x"\s*:\s*1\s*})/
        );
        expect(() => Spec.validate({ a: 2 })).toThrow(/^(?=.*\$)(?=.*"x")/);
        expect(() => Spec.validate({ b: 2 })).toThrow(/^(?=.*\$)(?=.*"x")/);

        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*{ x: number })(?=.*\$)(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*{ x: number })(?=.*\$)(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(/^(?=.*\$)(?=.*"x")/);
    });
});
describe("literal.validate 123", () => {
    const Spec_ = literal(123);
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = 123;
        Spec.validate(x);
        assert<eq<typeof x, 123>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate(456)).toThrow(/^(?=.*123(?=.*\$))(?=.*456)/);

        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*123(?=.*\$))(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*123(?=.*\$))(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(/^(?=.*\$)(?=.*\{\})/);
        expect(() => Spec.validate({ age: 123 })).toThrow(
            /^(?=.*\$)(?=.*\{\s*"age":\s*123\s*\})/
        );
    });
});
describe("enumNumbers.validate (enum E { A = 1, B = 2 })", () => {
    enum E {
        A = 1,
        B = 2,
    }
    const Spec_ = enumNumbers(E);
    const Spec: typeof Spec_ = Spec_;

    it("成功", () => {
        const x: unknown = E.A;
        Spec.validate(x);
        assert<eq<typeof x, E>>();
    });
    it("エラー", () => {
        expect(() => Spec.validate(null)).toThrow(
            /^(?=.*1 \| 2)(?=.*\$)(?=.*null)/
        );
        expect(() => Spec.validate(true)).toThrow(
            /^(?=.*1 \| 2)(?=.*\$)(?=.*true)/
        );
        expect(() => Spec.validate({})).toThrow(
            /^(?=.*1 \| 2)(?=.*\$)(?=.*\{\})/
        );
        expect(() => Spec.validate(3)).toThrow(/^(?=.*1 \| 2)(?=.*\$)(?=.*3)/);
    });
});

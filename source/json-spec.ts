type MutableObjectPath = (number | string)[];
const internalPathCache: MutableObjectPath = [];

const enum Precedence {
    /** @example `number | string` */
    Or,
    /** @example `{ x: string } & { y: number }` */
    And,
    /** @example `number[]` */
    Array,
    /** @example `number`, `{ k: p }`, `(string | null)` */
    Primary,
}
export abstract class Spec<T> {
    abstract readonly imitation: T;
    /** @internal */
    abstract _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is T;
    /** @internal */
    abstract readonly _internal_typeExpression: string;
    /** @internal */
    abstract readonly _internal_typeExpressionPrecedence: Precedence;
    validate(value: unknown): asserts value is T {
        try {
            this._internal_validateCore(value, internalPathCache);
        } finally {
            internalPathCache.length = 0;
        }
    }
}
function showObject(value: unknown) {
    return JSON.stringify(value) ?? String(value);
}
function showFullObjectPath(path: Readonly<MutableObjectPath>) {
    let result = "$";
    for (const x of path) {
        result += "." + String(x);
    }
    return result;
}

function exprOrWrapRaw(
    expr: string,
    exprPrecedence: Precedence,
    minPrecedence: Precedence
) {
    return exprPrecedence < minPrecedence ? `(${expr})` : expr;
}
function exprOrWrap(s: Spec<unknown>, minPrecedence: Precedence) {
    return exprOrWrapRaw(
        s._internal_typeExpression,
        s._internal_typeExpressionPrecedence,
        minPrecedence
    );
}
function showTypeMismatchMessage(
    expectedType: string,
    typePrecedence: Precedence,
    actualValue: unknown,
    path: Readonly<MutableObjectPath>
) {
    return `Expected ${exprOrWrapRaw(
        expectedType,
        typePrecedence,
        Precedence.Array
    )}. actual: ${showObject(actualValue)}. at: ${showFullObjectPath(path)}`;
}

function showPropertyNotFoundMessage(
    expectedKey: string,
    path: Readonly<MutableObjectPath>
) {
    return `Expected property "${expectedKey}". at: ${showFullObjectPath(
        path
    )}`;
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = ValidationError.name;
    }
}
export const string: Spec<string> = new (class StringSpec extends Spec<string> {
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (typeof value !== "string") {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
    override _internal_typeExpression = "string";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override imitation = "";
})();

export const number: Spec<number> = new (class NumberSpec extends Spec<number> {
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (typeof value !== "number") {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
    override _internal_typeExpression = "number";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override imitation = 0;
})();

export type PropertySpecs<Record> = {
    readonly [K in keyof Record]: Spec<Record[K]>;
};
type RecordKind = Readonly<Record<string, unknown>>;

const hasOwnProperty = Object.prototype.hasOwnProperty;
class RecordSpec<Record extends RecordKind> extends Spec<Record> {
    private readonly _specs: PropertySpecs<Record>;
    constructor(specs: PropertySpecs<Record>) {
        super();
        this._specs = { ...specs };
    }
    override get imitation() {
        const result: Record = Object.create(null);
        const specs = this._specs;
        for (const key in specs) {
            if (hasOwnProperty.call(specs, key)) {
                result[key] = specs[key].imitation;
            }
        }
        return result;
    }
    override get _internal_typeExpression() {
        const specs = this._specs;
        const properties = [];
        for (const key in specs) {
            if (hasOwnProperty.call(specs, key)) {
                properties.push(
                    `${key}: ${specs[key]._internal_typeExpression}`
                );
            }
        }
        return `{ ${properties.join(", ")} }`;
    }
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is Record {
        if (typeof value !== "object" || value === null) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
        const specs = this._specs;
        for (const key in specs) {
            if (!(key in value)) {
                throw new ValidationError(
                    showPropertyNotFoundMessage(key, path)
                );
            }
            const x: Spec<unknown> = specs[key];
            path.push(key);
            x._internal_validateCore(
                (value as { [k: string]: unknown })[key],
                path
            );
            path.pop();
        }
    }
}
export function record<Record extends RecordKind>(
    propertySpecs: PropertySpecs<Record>
): Spec<Record> {
    return new RecordSpec(propertySpecs);
}
export const object: Spec<object> = new (class ObjectSpec extends Spec<object> {
    override imitation = Object.freeze({});
    _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is object {
        if (typeof value !== "object" || value === null) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
    override _internal_typeExpression = "object";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
})();

export const emptyRecord: Spec<Record<string, undefined>> =
    new (class EmptyRecordSpec extends Spec<Record<string, undefined>> {
        override imitation = Object.freeze({});
        _internal_validateCore(
            value: unknown,
            path: MutableObjectPath
        ): asserts value is Record<string, undefined> {
            if (typeof value !== "object" || value === null) {
                throw new ValidationError(
                    showTypeMismatchMessage(
                        this._internal_typeExpression,
                        this._internal_typeExpressionPrecedence,
                        value,
                        path
                    )
                );
            }
            for (const _ in value) {
                throw new ValidationError(
                    showTypeMismatchMessage(
                        this._internal_typeExpression,
                        this._internal_typeExpressionPrecedence,
                        value,
                        path
                    )
                );
            }
        }
        override _internal_typeExpression = "Record<string, undefined>";
        override _internal_typeExpressionPrecedence = Precedence.Primary;
    })();

class ArraySpec<T> extends Spec<T[]> {
    constructor(private readonly _elementSpec: Spec<T>) {
        super();
    }
    override get imitation() {
        return [];
    }
    override get _internal_typeExpression() {
        return `${exprOrWrap(this._elementSpec, Precedence.Array)}[]`;
    }
    override _internal_typeExpressionPrecedence = Precedence.Array;
    override _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is T[] {
        if (!Array.isArray(value)) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
        const elementSpec: Spec<T> = this._elementSpec;
        for (let i = 0; i < value.length; i++) {
            path.push(i);
            elementSpec._internal_validateCore(value[i], path);
            path.pop();
        }
    }
}
export function array<T>(spec: Spec<T>): Spec<T[]> {
    return new ArraySpec(spec);
}

type cast<K, T> = T extends K ? T : K;
type SpecsKind = readonly Spec<unknown>[];
type SpecImitation<TSpec extends Spec<unknown>> = TSpec extends Spec<infer T>
    ? T
    : never;
type SpecsImitationUnion<TSpecs extends SpecsKind> = SpecImitation<
    TSpecs[number]
>;
type SpecsImitationIntersection<TSpecs extends SpecsKind> =
    TSpecs extends readonly [Spec<infer head>, ...infer rest]
        ? head & SpecsImitationIntersection<cast<SpecsKind, rest>>
        : unknown;

class OrSpec<
    TSpecs extends readonly [Spec<unknown>, Spec<unknown>, ...Spec<unknown>[]]
> extends Spec<SpecsImitationUnion<TSpecs>> {
    constructor(private readonly _specs: TSpecs) {
        super();
    }
    override get _internal_typeExpression() {
        return this._specs.map((s) => exprOrWrap(s, Precedence.Or)).join(" | ");
    }
    override _internal_typeExpressionPrecedence = Precedence.Or;
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        for (const spec of this._specs) {
            try {
                spec._internal_validateCore(value, path);
                return;
            } catch (e) {
                if (e instanceof Error && e.name === ValidationError.name) {
                    continue;
                }
                throw e;
            }
        }
        throw new ValidationError(
            showTypeMismatchMessage(
                this._internal_typeExpression,
                this._internal_typeExpressionPrecedence,
                value,
                path
            )
        );
    }
    override imitation = this._specs[0]
        .imitation as SpecsImitationUnion<TSpecs>;
}
function isTupleGe2<T>(tuple: readonly T[]): tuple is readonly [T, T, ...T[]] {
    return 2 <= tuple.length;
}
function isTuple1<T>(tuple: readonly T[]): tuple is readonly [T] {
    return 1 === tuple.length;
}
export const never: Spec<never> = new (class NeverSpec extends Spec<never> {
    constructor() {
        super();
    }
    override get imitation(): never {
        throw new Error("never");
    }
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        throw new ValidationError(
            showTypeMismatchMessage(
                this._internal_typeExpression,
                this._internal_typeExpressionPrecedence,
                value,
                path
            )
        );
    }
    override _internal_typeExpression = "never";
    override _internal_typeExpressionPrecedence = Precedence.Primary;
})();
export const unknown: Spec<unknown> =
    new (class UnknownSpec extends Spec<unknown> {
        constructor() {
            super();
        }
        override imitation = "unknown";
        override _internal_validateCore() {
            /* unknown すべての値を許可する */
        }
        override _internal_typeExpression = "unknown";
        override _internal_typeExpressionPrecedence = Precedence.Primary;
    })();

export function or<TSpecs extends Spec<unknown>[]>(
    ...specs: TSpecs
): Spec<SpecsImitationUnion<TSpecs>> {
    if (isTupleGe2(specs)) {
        return new OrSpec(specs);
    }
    if (isTuple1(specs)) {
        return specs[0] as Spec<SpecsImitationUnion<TSpecs>>;
    }
    return never;
}
class AndSpec<
    TSpecs extends readonly [Spec<unknown>, Spec<unknown>, ...Spec<unknown>[]]
> extends Spec<SpecsImitationIntersection<TSpecs>> {
    constructor(private readonly _specs: TSpecs) {
        super();
    }
    override _internal_typeExpressionPrecedence = Precedence.And;
    override get _internal_typeExpression() {
        return this._specs
            .map((s) => exprOrWrap(s, Precedence.And))
            .join(" & ");
    }
    override get imitation() {
        type record = Record<string, unknown>;
        return this._specs.reduce<record>((result, { imitation }) => {
            if (imitation !== null && typeof imitation === "object") {
                return {
                    ...result,
                    ...imitation,
                };
            }
            throw new Error("never");
        }, Object.create(null)) as SpecsImitationIntersection<TSpecs>;
    }
    _internal_validateCore(
        value: unknown,
        path: MutableObjectPath
    ): asserts value is SpecsImitationIntersection<TSpecs> {
        for (const spec of this._specs) {
            spec._internal_validateCore(value, path);
        }
    }
}
export function and<TSpecs extends Spec<unknown>[]>(
    ...specs: TSpecs
): Spec<SpecsImitationIntersection<TSpecs>> {
    if (isTupleGe2(specs)) {
        return new AndSpec(specs);
    }
    if (isTuple1(specs)) {
        return specs[0] as Spec<SpecsImitationIntersection<TSpecs>>;
    }
    return unknown as Spec<SpecsImitationIntersection<TSpecs>>;
}
export type LiteralKind = undefined | null | boolean | number | string;
class LiteralSpec<T extends LiteralKind> extends Spec<T> {
    constructor(override imitation: T) {
        super();
    }
    override get _internal_typeExpression() {
        return this.imitation === undefined
            ? "undefined"
            : JSON.stringify(this.imitation);
    }
    override _internal_typeExpressionPrecedence = Precedence.Primary;
    override _internal_validateCore(value: unknown, path: MutableObjectPath) {
        if (value !== this.imitation) {
            throw new ValidationError(
                showTypeMismatchMessage(
                    this._internal_typeExpression,
                    this._internal_typeExpressionPrecedence,
                    value,
                    path
                )
            );
        }
    }
}
export function literal<T extends LiteralKind>(value: T): Spec<T> {
    return new LiteralSpec(value);
}
function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
    return 0 < array.length;
}
type Values<T> = T[keyof T];
type EnumNumbersImitation<
    TEnumParent extends { readonly [name: string]: unknown }
> = Values<{
    [k in keyof TEnumParent as number extends k ? never : k]: TEnumParent[k];
}>;
export function enumNumbers<
    EnumParent extends { readonly [name: string | number]: string | number }
>(parent: EnumParent): Spec<EnumNumbersImitation<EnumParent>> {
    const literalSpecs: Spec<number>[] = [];
    for (const k of Object.keys(parent)) {
        const value = parent[k];
        if (typeof value === "number") {
            literalSpecs.push(literal(value));
        }
    }
    if (!isNonEmpty(literalSpecs)) {
        throw new Error("no enum values");
    }
    return or(...literalSpecs) as Spec<EnumNumbersImitation<EnumParent>>;
}

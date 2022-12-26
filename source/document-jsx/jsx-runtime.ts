import { assertTrue, equals } from "../standard-extensions";

type KnownElementTagNameMap = HTMLElementTagNameMap & SVGElementTagNameMap;
const knownSvgTagNames = [
    "a",
    "animate",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "foreignObject",
    "g",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "script",
    "set",
    "stop",
    "style",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "title",
    "tspan",
    "use",
    "view",
] as const;
const knownSvgTagNamesSet = new Set<string>(knownSvgTagNames);

assertTrue<
    equals<typeof knownSvgTagNames[number], keyof SVGElementTagNameMap>
>();

type KnownAttributeNameAndType<
    TTagName extends keyof KnownElementTagNameMap,
    TPropertyName extends keyof KnownElementTagNameMap[TTagName]
> = TPropertyName extends "classList"
    ? { name: "class"; type: string }
    : TPropertyName extends "htmlFor"
    ? { name: "for"; type: string }
    : KnownElementTagNameMap[TTagName][TPropertyName] extends
          | string
          | boolean
          | number
    ? {
          name: TPropertyName;
          type: KnownElementTagNameMap[TTagName][TPropertyName];
      }
    : KnownElementTagNameMap[TTagName][TPropertyName] extends SVGAnimatedLength
    ? {
          name: TPropertyName;
          type: number | string;
      }
    : KnownElementTagNameMap[TTagName][TPropertyName] extends SVGAnimatedEnumeration
    ? {
          name: TPropertyName;
          type: string;
      }
    : TPropertyName extends "style"
    ? {
          name: TPropertyName;
          type: string | ((style: CSSStyleDeclaration) => void);
      }
    : [TTagName, TPropertyName] extends ["marker", "orientAngle"]
    ? {
          name: "orient";
          type: string;
      }
    : { name: never; type: never };

type KnownExtendedAttributes<TTagName extends keyof KnownElementTagNameMap> =
    TTagName extends "path"
        ? {
              d: string;
              fill: string;
              stroke: string;
          }
        : // eslint-disable-next-line @typescript-eslint/ban-types
          {};

type ElementProperties<TName extends keyof KnownElementTagNameMap> = {
    [k in keyof KnownElementTagNameMap[TName] as KnownAttributeNameAndType<
        TName,
        k
    >["name"]]?: KnownAttributeNameAndType<TName, k>["type"];
} & KnownExtendedAttributes<TName>;

type falsy = false | null | undefined | 0 | "" | void;
interface JsxOption {
    key?: string | number;
}
type Children = readonly (HTMLElement | string | falsy)[];
type ChildrenProperty =
    | readonly (HTMLElement | string | falsy)[]
    | HTMLElement
    | string
    | falsy;

export function jsxs<TName extends keyof KnownElementTagNameMap>(
    name: TName,
    properties: Readonly<
        ElementProperties<TName> & {
            children?: ChildrenProperty;
        }
    > | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _option?: JsxOption
): KnownElementTagNameMap[TName] {
    const element = knownSvgTagNamesSet.has(name)
        ? document.createElementNS("http://www.w3.org/2000/svg", name)
        : document.createElement(name);
    for (const [key, value] of Object.entries(properties ?? {})) {
        if (key === "children") continue;
        if (key === "style" && typeof value === "function") {
            value(element.style);
            continue;
        }
        element.setAttribute(key, String(value));
    }
    const children = properties?.children;
    if (children) {
        if (Array.isArray(children)) {
            for (const child of children as Children) {
                if (!child) continue;
                element.append(child);
            }
        } else {
            element.append(children as HTMLElement | string);
        }
    }
    return element as KnownElementTagNameMap[TName];
}
export const jsx = jsxs;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
    export type Element = HTMLElement;
    export type IntrinsicElements = {
        [tagName in keyof KnownElementTagNameMap]: ElementProperties<tagName>;
    };
}

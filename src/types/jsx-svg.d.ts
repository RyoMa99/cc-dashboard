// Hono JSX の IntrinsicElements はキャッチオール [tagName: string]: Props を持つため
// SVG 要素は既に使用可能だが、使用する SVG 要素とその属性を明示的に宣言する。
// これにより IDE の補完サポートとドキュメンテーションの価値を提供する。

import "hono/jsx";

declare module "hono/jsx" {
  namespace JSX {
    interface SVGAttributes {
      [key: string]: unknown;
      class?: string;
      id?: string;
      style?: string;
      children?: unknown;
    }

    interface IntrinsicElements {
      svg: SVGAttributes & {
        viewBox?: string;
        width?: string | number;
        height?: string | number;
        xmlns?: string;
        role?: string;
        "aria-label"?: string;
      };
      g: SVGAttributes & {
        transform?: string;
      };
      rect: SVGAttributes & {
        x?: number | string;
        y?: number | string;
        width?: number | string;
        height?: number | string;
        rx?: number | string;
        ry?: number | string;
        fill?: string;
        stroke?: string;
        "stroke-width"?: number | string;
        opacity?: number | string;
      };
      line: SVGAttributes & {
        x1?: number | string;
        y1?: number | string;
        x2?: number | string;
        y2?: number | string;
        stroke?: string;
        "stroke-width"?: number | string;
        "stroke-dasharray"?: string;
      };
      text: SVGAttributes & {
        x?: number | string;
        y?: number | string;
        dx?: number | string;
        dy?: number | string;
        fill?: string;
        "font-size"?: number | string;
        "font-weight"?: string;
        "text-anchor"?: "start" | "middle" | "end";
        "dominant-baseline"?: string;
      };
      title: SVGAttributes;
    }
  }
}

import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  Fragment,
} from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { replaceTitleSegment, titleWords } from "../lib/title-case";

type TextProps = {
  children?: ReactNode;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};
type TitleTag = "h1" | "h2" | "h3" | "h4" | "span" | "strong" | "label";

// Format the whole title together so a word after a line break is still a middle word.
function titleContent(children: ReactNode) {
  function visit(nodes: ReactNode, text: (value: string) => string): ReactNode {
    return Children.map(nodes, (node) => {
      if (typeof node === "string") return text(node);
      if (typeof node === "number") {
        text(String(node));
        return node;
      }
      if (!isValidElement<TextProps>(node)) return node;
      if (
        (typeof node.type !== "string" && node.type !== Fragment) ||
        node.type === "svg" ||
        node.props["aria-hidden"] === true ||
        node.props["aria-hidden"] === "true" ||
        node.props.className?.split(" ").includes("notation-san")
      )
        return node;
      return cloneElement(node, undefined, visit(node.props.children, text));
    });
  }
  const segments: string[] = [];
  visit(children, (text) => {
    segments.push(text);
    return text;
  });
  const replacements = titleWords(segments.join(" "));
  let offset = 0;
  return visit(children, (text) => {
    const value = replaceTitleSegment(text, offset, replacements);
    offset += text.length + 1;
    return value;
  });
}

export default function Title({
  as = "span",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: TitleTag; htmlFor?: string }) {
  return createElement(as, props, titleContent(children));
}

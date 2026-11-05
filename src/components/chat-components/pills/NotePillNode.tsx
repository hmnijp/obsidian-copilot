import React from "react";
import {
  $getRoot,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from "lexical";
import { BasePillNode, getEditorDocument, SerializedBasePillNode } from "./BasePillNode";
import { TruncatedPillText } from "./TruncatedPillText";
import { PillBadge } from "./PillBadge";

export interface SerializedNotePillNode extends SerializedBasePillNode {
  noteTitle: string;
  notePath: string;
  linkText?: string;
}

export class NotePillNode extends BasePillNode {
  __noteTitle: string;
  __notePath: string;
  __linkText: string;

  static getType(): string {
    return "note-pill";
  }

  static clone(node: NotePillNode): NotePillNode {
    return new NotePillNode(node.__noteTitle, node.__notePath, node.__linkText, node.__key);
  }

  constructor(noteTitle: string, notePath: string, linkText = "", key?: NodeKey) {
    super(noteTitle, key);
    this.__noteTitle = noteTitle;
    this.__notePath = notePath;
    this.__linkText = linkText;
  }

  getClassName(): string {
    return "note-pill-wrapper";
  }

  getDataAttribute(): string {
    return "data-lexical-note-pill";
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) => {
        if (node.hasAttribute("data-lexical-note-pill")) {
          return {
            conversion: convertNotePillElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  static importJSON(serializedNode: SerializedNotePillNode): NotePillNode {
    const { noteTitle, notePath, linkText } = serializedNode;
    return $createNotePillNode(noteTitle, notePath, linkText ?? "");
  }

  exportJSON(): SerializedNotePillNode {
    return {
      ...super.exportJSON(),
      noteTitle: this.__noteTitle,
      notePath: this.__notePath,
      linkText: this.__linkText,
      type: "note-pill",
      version: 1,
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = getEditorDocument(editor).win.createSpan({
      text: this.getTextContent(),
      attr: {
        "data-lexical-note-pill": "true",
        "data-note-title": this.__noteTitle,
        "data-note-path": this.__notePath,
        "data-note-link-text": this.__linkText,
      },
    });
    return { element };
  }

  getTextContent(): string {
    if (this.__linkText) return this.__linkText;
    const lowerPath = this.__notePath.toLowerCase();
    const displayName = lowerPath.endsWith(".pdf")
      ? `${this.__noteTitle}.pdf`
      : lowerPath.endsWith(".canvas")
        ? `${this.__noteTitle}.canvas`
        : this.__noteTitle;
    return `[[${displayName}]]`;
  }

  getNoteTitle(): string {
    return this.__noteTitle;
  }

  getNotePath(): string {
    return this.__notePath;
  }

  decorate(): JSX.Element {
    return <NotePillComponent node={this} />;
  }
}

function convertNotePillElement(domNode: HTMLElement): DOMConversionOutput | null {
  const noteTitle = domNode.getAttribute("data-note-title");
  const notePath = domNode.getAttribute("data-note-path");
  if (noteTitle && notePath) {
    const linkText = domNode.getAttribute("data-note-link-text") ?? "";
    const node = $createNotePillNode(noteTitle, notePath, linkText);
    return { node };
  }
  return null;
}

interface NotePillComponentProps {
  node: NotePillNode;
}

function NotePillComponent({ node }: NotePillComponentProps): JSX.Element {
  const noteTitle = node.getNoteTitle();
  const notePath = node.getNotePath();
  const lowerPath = notePath.toLowerCase();
  const isPdf = lowerPath.endsWith(".pdf");
  const isCanvas = lowerPath.endsWith(".canvas");

  const tooltipContent = <div className="tw-text-left">{notePath}</div>;

  return (
    <PillBadge>
      <div className="tw-flex tw-items-center tw-gap-1">
        <TruncatedPillText
          content={noteTitle}
          openBracket="[["
          closeBracket="]]"
          tooltipContent={tooltipContent}
        />
        {isPdf && <span className="tw-text-xs tw-text-faint">pdf</span>}
        {isCanvas && <span className="tw-text-xs tw-text-faint">canvas</span>}
      </div>
    </PillBadge>
  );
}

export function $createNotePillNode(
  noteTitle: string,
  notePath: string,
  linkText = ""
): NotePillNode {
  return new NotePillNode(noteTitle, notePath, linkText);
}

export function $isNotePillNode(node: LexicalNode | null | undefined): node is NotePillNode {
  return node instanceof NotePillNode;
}

export function $removePillsByPath(notePath: string): number {
  const root = $getRoot();
  let removedCount = 0;

  function traverse(node: LexicalNode): void {
    if ($isNotePillNode(node) && node.getNotePath() === notePath) {
      node.remove();
      removedCount++;
    } else if ("getChildren" in node && typeof node.getChildren === "function") {
      const children = node.getChildren() as LexicalNode[];
      for (const child of children) {
        traverse(child);
      }
    }
  }

  traverse(root);
  return removedCount;
}

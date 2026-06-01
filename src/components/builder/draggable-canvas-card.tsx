"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  duplicateProposalBlockAction,
  reorderProposalBlocksAction,
  toggleProposalBlockVisibilityAction,
} from "@/app/dashboard/proposals/[proposalId]/actions";
import {
  getProposalBlockLabel,
} from "@/lib/proposal-builder";
import type { ProposalBlock } from "@/types/domain";

type DraggableCanvasCardProps = {
  proposalId: string;
  block: ProposalBlock;
  index: number;
  isActive: boolean;
  panelMode: "block" | "concept" | "publish";
  sidebarMode: string;
  openHref: string;
};

type DropPosition = "before" | "after" | null;

function getDropPosition(event: React.DragEvent<HTMLDivElement>): Exclude<DropPosition, null> {
  const rect = event.currentTarget.getBoundingClientRect();
  const middle = rect.top + rect.height / 2;
  return event.clientY >= middle ? "after" : "before";
}

export function DraggableCanvasCard({
  proposalId,
  block,
  index,
  isActive,
  panelMode,
  sidebarMode,
  openHref,
}: DraggableCanvasCardProps) {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const positionInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(event: React.DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/proposal-block-id", block.id);
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
    setDropPosition(null);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    const sourceBlockId = event.dataTransfer.getData("text/proposal-block-id");

    if (!sourceBlockId || sourceBlockId === block.id) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropPosition(getDropPosition(event));
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setDropPosition(null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const sourceBlockId = event.dataTransfer.getData("text/proposal-block-id");

    if (!sourceBlockId || sourceBlockId === block.id) {
      setDropPosition(null);
      return;
    }

    event.preventDefault();

    if (sourceInputRef.current) {
      sourceInputRef.current.value = sourceBlockId;
    }

    if (positionInputRef.current) {
      positionInputRef.current.value = getDropPosition(event);
    }

    setDropPosition(null);
    formRef.current?.requestSubmit();
  }

  return (
    <div
      className={`grid gap-3 ${dropPosition ? `builder-canvas-drop-${dropPosition}` : ""} ${isDragging ? "builder-canvas-dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`editor-page-toolbar ${isActive ? "editor-page-toolbar-active" : ""}`}>
        <button
          className="editor-drag-handle"
          type="button"
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          aria-label="Перетащить блок"
          title="Перетащить блок"
        >
          <span aria-hidden="true">⋮⋮</span>
          Перетащить
        </button>
        <Link className={isActive && panelMode === "block" ? "editor-toolbar-chip editor-toolbar-chip-active" : "editor-toolbar-chip"} href={openHref}>
          {isActive && panelMode === "block" ? "Выбран" : "Открыть"}
        </Link>
        <form action={duplicateProposalBlockAction}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="blockId" value={block.id} />
          <input type="hidden" name="panel" value="block" />
          <input type="hidden" name="sidebar" value={sidebarMode} />
          <button className="editor-toolbar-chip" type="submit">
            Дублировать
          </button>
        </form>
        <form action={toggleProposalBlockVisibilityAction}>
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="blockId" value={block.id} />
          <input type="hidden" name="panel" value="block" />
          <input type="hidden" name="sidebar" value={sidebarMode} />
          <button className="editor-toolbar-chip" type="submit">
            {block.visible ? "Скрыть" : "Показать"}
          </button>
        </form>
      </div>

      <form ref={formRef} action={reorderProposalBlocksAction} className="hidden">
        <input type="hidden" name="proposalId" value={proposalId} />
        <input ref={sourceInputRef} type="hidden" name="sourceBlockId" value="" />
        <input type="hidden" name="targetBlockId" value={block.id} />
        <input ref={positionInputRef} type="hidden" name="position" value="before" />
        <input type="hidden" name="panel" value="block" />
        <input type="hidden" name="sidebar" value={sidebarMode} />
      </form>

      <Link className="block" href={openHref}>
        <article id={`block-${block.id}`} className={`editor-page-block ${isActive ? "editor-page-block-active" : ""}`}>
          <div className="editor-page-visual">
            {block.payload.eyebrow ? (
              <div className="editor-page-eyebrow">{block.payload.eyebrow}</div>
            ) : null}
            <div className="editor-page-title mt-3">
              {block.payload.headline || block.title || getProposalBlockLabel(block.type)}
            </div>
            {block.payload.metrics?.length ? (
              <div className="editor-page-metrics mt-8">
                {block.payload.metrics.slice(0, 3).map((metric) => (
                  <div key={`${metric.label}-${metric.value}`} className="editor-page-metric-card">
                    <div className="editor-page-metric-value">{metric.value}</div>
                    <div className="editor-page-metric-label">{metric.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {block.payload.ctaLabel ? (
              <div className="mt-8">
                <span className="editor-page-cta">{block.payload.ctaLabel}</span>
              </div>
            ) : null}
          </div>
        </article>
      </Link>
    </div>
  );
}
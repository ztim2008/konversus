"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";

import {
  ProposalBlock,
  ProposalBlockType,
  CommercialCard,
  ContactItem,
  GalleryPhoto,
  ProposalMetric,
  TimelineStep,
} from "@/types/domain";
import {
  activeProposalBlockCatalog,
  createProposalBlock,
  getProposalBlockCategory,
  getProposalBlockCatalogByCategory,
  getProposalBlockLabel,
  getRecommendedNextBlockTemplates,
} from "@/lib/proposal-builder";
import { renderBlock } from "@/components/share/block-renderers";

type EditorCanvasProps = {
  blocks: ProposalBlock[];
  shareUrl: string | null;
  previewKey?: number;
  saveState?: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: string | null;
  onBlocksChange: (blocks: ProposalBlock[]) => void;
  onBlockDelete: (blockId: string) => void;
  onBlockMove: (blockId: string, delta: -1 | 1) => void;
};

const DEMO_FLOW: ProposalBlockType[] = [
  "hero",
];

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageFile(file: File, maxPx = 1400) {
  const form = new FormData();
  form.append("image", file);
  form.append("max_px", String(maxPx));
  form.append("kind", "image");

  try {
    const response = await fetch("/sales-doc/upload.php", {
      method: "POST",
      body: form,
    });
    const json = await response.json();
    if (response.ok && json?.url) {
      return String(json.url);
    }
  } catch {
    // fallback на data URL
  }

  return fileToDataUrl(file);
}

function reorderBlocks(
  sourceId: string,
  targetId: string,
  position: "before" | "after",
  blocks: ProposalBlock[]
) {
  if (sourceId === targetId) return blocks;

  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return blocks;

  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  const normalizedTargetIndex = next.findIndex((block) => block.id === targetId);
  const insertionIndex = position === "after" ? normalizedTargetIndex + 1 : normalizedTargetIndex;
  next.splice(Math.max(insertionIndex, 0), 0, moved);
  return next;
}

export function EditorCanvas({
  blocks,
  shareUrl,
  saveState = "idle",
  lastSavedAt = null,
  onBlocksChange,
  onBlockDelete,
  onBlockMove,
}: EditorCanvasProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    blocks.length > 0 ? blocks[0].id : null
  );
  const [addBlockType, setAddBlockType] = useState<ProposalBlockType>(activeProposalBlockCatalog[0].type);
  const [canvasMode, setCanvasMode] = useState<"desktop" | "mobile">("desktop");
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragCatalogType, setDragCatalogType] = useState<ProposalBlockType | null>(null);
  const [dragTarget, setDragTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

  const editableBlocks = useMemo(
    () => blocks.filter((block) => block.visible !== false),
    [blocks]
  );

  const effectiveSelectedBlockId = useMemo(() => {
    if (!editableBlocks.length) return null;
    if (selectedBlockId && editableBlocks.some((block) => block.id === selectedBlockId)) return selectedBlockId;
    return editableBlocks[0].id;
  }, [editableBlocks, selectedBlockId]);

  const selectedBlock = useMemo(
    () => editableBlocks.find((block) => block.id === effectiveSelectedBlockId) ?? null,
    [editableBlocks, effectiveSelectedBlockId]
  );

  const selectedBlockIndex = useMemo(
    () => editableBlocks.findIndex((block) => block.id === effectiveSelectedBlockId),
    [editableBlocks, effectiveSelectedBlockId]
  );

  const selectedRawIndex = useMemo(
    () => blocks.findIndex((block) => block.id === effectiveSelectedBlockId),
    [blocks, effectiveSelectedBlockId]
  );

  const insertAfterSelectedIndex = selectedRawIndex >= 0 ? selectedRawIndex + 1 : blocks.length;

  const visibleBlocksCount = useMemo(
    () => editableBlocks.length,
    [editableBlocks]
  );

  const catalogGroups = useMemo(() => getProposalBlockCatalogByCategory(), []);

  const updateBlockData = useCallback(
    (blockId: string, updates: Partial<ProposalBlock>) => {
      const updated = blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block
      );
      onBlocksChange(updated);
    },
    [blocks, onBlocksChange]
  );

  const updateBlockPayload = useCallback(
    (blockId: string, key: string, value: unknown) => {
      const updated = blocks.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          payload: {
            ...block.payload,
            [key]: value,
          },
        };
      });
      onBlocksChange(updated);
    },
    [blocks, onBlocksChange]
  );

  const insertBlock = useCallback(
    (type: ProposalBlockType, insertionIndex = blocks.length) => {
      const nextBlock = createProposalBlock(type);
      const normalizedInsertionIndex = Math.min(Math.max(insertionIndex, 0), blocks.length);
      const updated = [...blocks];
      updated.splice(normalizedInsertionIndex, 0, nextBlock);
      onBlocksChange(updated);
      setSelectedBlockId(nextBlock.id);
    },
    [blocks, onBlocksChange]
  );

  const renderQuickInsert = useCallback(
    (insertionIndex: number, previousType?: ProposalBlockType | null) => {
      const recommendedTemplates = getRecommendedNextBlockTemplates(previousType).slice(0, 3);

      return (
        <div className="editor-canvas-insert-zone">
          <div className="editor-canvas-insert-head">
            {insertionIndex === 0 ? "Быстрый старт" : `Вставить после выбранного блока`}
          </div>
          <div className="editor-canvas-insert-recommended">
            {recommendedTemplates.map((template) => (
              <button
                type="button"
                key={template.type}
                className="editor-canvas-btn-small"
                onClick={() => insertBlock(template.type, insertionIndex)}
                title={template.narrativeRole}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      );
    },
    [insertBlock]
  );

  const applyDemoStructure = useCallback(() => {
    const demoBlocks = DEMO_FLOW.map((type) => createProposalBlock(type));
    onBlocksChange(demoBlocks);
    setSelectedBlockId(demoBlocks[0]?.id ?? null);
  }, [onBlocksChange]);

  const handleBlockDrop = useCallback(
    (targetId: string, position: "before" | "after") => {
      if (dragCatalogType) {
        const targetIndex = blocks.findIndex((block) => block.id === targetId);
        const insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
        insertBlock(dragCatalogType, insertionIndex);
        setDragCatalogType(null);
        setDragTarget(null);
        return;
      }

      if (dragSourceId) {
        const updated = reorderBlocks(dragSourceId, targetId, position, blocks);
        onBlocksChange(updated);
        setSelectedBlockId(dragSourceId);
      }

      setDragSourceId(null);
      setDragTarget(null);
    },
    [blocks, dragCatalogType, dragSourceId, insertBlock, onBlocksChange]
  );

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();

      if (dragCatalogType) {
        insertBlock(dragCatalogType, blocks.length);
      }

      setDragCatalogType(null);
      setDragSourceId(null);
      setDragTarget(null);
    },
    [blocks.length, dragCatalogType, insertBlock]
  );

  return (
    <div className="editor-canvas-layout">
      <aside className="editor-canvas-left">
        <div className="editor-canvas-panel editor-canvas-catalog-panel">
          <div className="editor-canvas-panel-head">Библиотека смысловых блоков</div>
          <div className="editor-canvas-catalog-groups">
            {catalogGroups.map(({ category, blocks: catalogBlocks }) => (
              <section className="editor-canvas-catalog-group" key={category.id}>
                <div className="editor-canvas-catalog-category">
                  <span>{category.title}</span>
                  <small>{category.purpose}</small>
                </div>
                <div className="editor-canvas-catalog-list">
                  {catalogBlocks.map((template) => (
                    <button
                      type="button"
                      className="editor-canvas-catalog-card"
                      key={template.type}
                      draggable
                      onDragStart={() => setDragCatalogType(template.type)}
                      onDragEnd={() => {
                        setDragCatalogType(null);
                        setDragTarget(null);
                      }}
                      onClick={() => insertBlock(template.type, insertAfterSelectedIndex)}
                    >
                      <span className="editor-canvas-catalog-icon">{template.icon}</span>
                      <span>
                        <strong>{template.label}</strong>
                        <small>{template.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="editor-canvas-panel editor-canvas-structure-panel">
          <div className="editor-canvas-panel-head">Структура страницы</div>
          <div className="editor-canvas-panel-tools">
            <div className="editor-canvas-structure-add">
              <select
                className="editor-canvas-input editor-canvas-input-small"
                value={addBlockType}
                onChange={(event) => setAddBlockType(event.target.value as ProposalBlockType)}
              >
                {activeProposalBlockCatalog.map((template) => (
                  <option key={template.type} value={template.type}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="editor-canvas-btn-small"
                onClick={() => insertBlock(addBlockType, insertAfterSelectedIndex)}
              >
                Добавить
              </button>
            </div>
            <button type="button" className="editor-canvas-btn-small" onClick={applyDemoStructure}>Демо-кейс</button>
            <div className="editor-canvas-helper">{visibleBlocksCount} блоков</div>
            {renderQuickInsert(insertAfterSelectedIndex, selectedBlock?.type ?? null)}
          </div>

          <div className="editor-canvas-block-list">
            {editableBlocks.length === 0 ? (
              <div className="editor-canvas-empty">Добавь первый блок из каталога</div>
            ) : (
              editableBlocks.map((block, idx) => (
                <div
                  key={block.id}
                  className={[
                    "editor-canvas-block-item",
                    effectiveSelectedBlockId === block.id ? "active" : "",
                    dragTarget?.id === block.id && dragTarget.position === "before" ? "drop-before" : "",
                    dragTarget?.id === block.id && dragTarget.position === "after" ? "drop-after" : "",
                  ].join(" ")}
                  draggable
                  onDragStart={() => setDragSourceId(block.id)}
                  onDragEnd={() => {
                    setDragSourceId(null);
                    setDragTarget(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const position = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
                    setDragTarget({ id: block.id, position });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const position = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
                    handleBlockDrop(block.id, position);
                  }}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  <div className="editor-canvas-block-index">{idx + 1}</div>
                  <div className="editor-canvas-block-info">
                    <div className="editor-canvas-block-type">{getProposalBlockCategory(block.type)}</div>
                    <div className="editor-canvas-block-title">{block.payload?.headline || getProposalBlockLabel(block.type)}</div>
                  </div>
                  <div className="editor-canvas-block-actions">
                    <button className="editor-canvas-action-btn" title="Перетащить">⋮⋮</button>
                    <button
                      className="editor-canvas-action-btn editor-canvas-action-del"
                      title="Удалить"
                      onClick={(event) => {
                        event.stopPropagation();
                        onBlockDelete(block.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="editor-canvas-center">
        <div className="editor-canvas-toolbar">
          <div className="editor-canvas-mode-switch">
            <button
              type="button"
              className={`editor-canvas-btn ${canvasMode === "desktop" ? "editor-canvas-btn-active" : ""}`}
              onClick={() => setCanvasMode("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`editor-canvas-btn ${canvasMode === "mobile" ? "editor-canvas-btn-active" : ""}`}
              onClick={() => setCanvasMode("mobile")}
            >
              Mobile
            </button>
          </div>
          {shareUrl ? (
            <span className="editor-canvas-url">{shareUrl}</span>
          ) : (
            <span className="editor-canvas-url">Опубликуй страницу и открой финальный preview по ссылке справа</span>
          )}
          {shareUrl && (
            <a
              className="editor-canvas-btn editor-canvas-btn-accent"
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              Открыть ↗
            </a>
          )}
        </div>

        <div
          className={`editor-canvas-preview ${dragCatalogType ? "drag-catalog" : ""}`}
          onDragOver={(event) => {
            if (dragCatalogType) {
              event.preventDefault();
            }
          }}
          onDrop={handleCanvasDrop}
        >
          <div className={`editor-canvas-doc-shell ${canvasMode}`}>
            <div className="editor-canvas-doc fpb-page" data-theme="graphite">
              <div className="page">
                {editableBlocks.map((block) => {
                  const rendered = renderBlock(block);
                  return (
                    <div
                      key={block.id}
                      className={[
                        "editor-canvas-stage-block",
                        effectiveSelectedBlockId === block.id ? "active" : "",
                        !block.visible ? "hidden" : "",
                        dragTarget?.id === block.id && dragTarget.position === "before" ? "drop-before" : "",
                        dragTarget?.id === block.id && dragTarget.position === "after" ? "drop-after" : "",
                      ].join(" ")}
                      draggable
                      onDragStart={() => setDragSourceId(block.id)}
                      onDragEnd={() => {
                        setDragSourceId(null);
                        setDragTarget(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const position = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        setDragTarget({ id: block.id, position });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const position = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        handleBlockDrop(block.id, position);
                      }}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <div className="editor-canvas-stage-toolbar">
                        <span>{getProposalBlockLabel(block.type)}</span>
                        <div className="editor-canvas-stage-actions">
                          <button
                            type="button"
                            className="editor-canvas-action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBlockMove(block.id, -1);
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="editor-canvas-action-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBlockMove(block.id, 1);
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="editor-canvas-action-btn editor-canvas-action-del"
                            onClick={(event) => {
                              event.stopPropagation();
                              onBlockDelete(block.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      {rendered ?? (
                        <section className="block">
                          <div className="section-kicker">Скрытый блок</div>
                          <h2 className="block-title">{getProposalBlockLabel(block.type)}</h2>
                        </section>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="editor-canvas-right">
        <div className="editor-canvas-panel">
          <div className="editor-canvas-panel-head editor-canvas-panel-head-with-state">
            <span>{selectedBlock ? getProposalBlockLabel(selectedBlock.type) : "Свойства"}</span>
            <span className={`editor-canvas-save-state editor-canvas-save-state-${saveState}`}>
              {saveState === "saving" && "Сохраняю"}
              {saveState === "saved" && (lastSavedAt ? `Сохранено ${lastSavedAt}` : "Сохранено")}
              {saveState === "error" && "Ошибка"}
              {saveState === "idle" && "Готово"}
            </span>
          </div>
          {selectedBlock ? (
            <div className="editor-canvas-props">
              <div className="editor-canvas-helper">
                Блок {selectedBlockIndex + 1} · {getProposalBlockCategory(selectedBlock.type)}
              </div>

              <div className="editor-canvas-quick-actions">
                <button
                  type="button"
                  className="editor-canvas-btn-small"
                  disabled={selectedBlockIndex <= 0}
                  onClick={() => onBlockMove(selectedBlock.id, -1)}
                >
                  Сдвинуть выше
                </button>
                <button
                  type="button"
                  className="editor-canvas-btn-small"
                  disabled={selectedBlockIndex >= blocks.length - 1}
                  onClick={() => onBlockMove(selectedBlock.id, 1)}
                >
                  Сдвинуть ниже
                </button>
                <button
                  type="button"
                  className="editor-canvas-btn-small editor-canvas-btn-small-danger"
                  onClick={() => onBlockDelete(selectedBlock.id)}
                >
                  Удалить блок
                </button>
              </div>

              <div className="editor-canvas-prop-group">
                <label className="editor-canvas-label">Внутреннее название</label>
                <input
                  type="text"
                  value={selectedBlock.title || ""}
                  onChange={(event) => updateBlockData(selectedBlock.id, { title: event.target.value })}
                  className="editor-canvas-input"
                />
              </div>

              <CommonTextEditor block={selectedBlock} onUpdate={updateBlockPayload} />

              {(selectedBlock.type === "about-panel" || selectedBlock.type === "cta") && (
                <CtaEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "editorial" || selectedBlock.type === "about-panel" ? (
                <LineListEditor
                  title="Пункты"
                  value={(selectedBlock.payload.bullets ?? []).join("\n")}
                  onChange={(value) => updateBlockPayload(selectedBlock.id, "bullets", parseLines(value))}
                />
              ) : null}

              {selectedBlock.type === "hero" && (
                <HeroVisualEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "metrics" && (
                <MetricsEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {(selectedBlock.type === "gallery-photo" || selectedBlock.type === "gallery-showcase") && (
                <PhotosEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "video-block" && (
                <VideoEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "before-after" && (
                <BeforeAfterEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "timeline" && (
                <TimelineEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "commercial" && (
                <CommercialEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "cta" && (
                <ContactsEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}

              {selectedBlock.type === "custom-html" && (
                <CustomHtmlEditor block={selectedBlock} onUpdate={updateBlockPayload} />
              )}
            </div>
          ) : (
            <div className="editor-canvas-hint">Выберите блок слева или в центре</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function CommonTextEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Надзаголовок</label>
        <input
          type="text"
          value={block.payload?.eyebrow || ""}
          onChange={(event) => onUpdate(block.id, "eyebrow", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Заголовок</label>
        <input
          type="text"
          value={block.payload?.headline || ""}
          onChange={(event) => onUpdate(block.id, "headline", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Текст</label>
        <textarea
          value={block.payload?.body || ""}
          onChange={(event) => onUpdate(block.id, "body", event.target.value)}
          className="editor-canvas-textarea"
          rows={3}
        />
      </div>
    </>
  );
}

function CtaEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  return (
    <div className="editor-canvas-grid-2">
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">CTA 1 текст</label>
        <input
          type="text"
          value={block.payload?.ctaLabel || ""}
          onChange={(event) => onUpdate(block.id, "ctaLabel", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">CTA 1 ссылка</label>
        <input
          type="text"
          value={block.payload?.ctaHref || ""}
          onChange={(event) => onUpdate(block.id, "ctaHref", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">CTA 2 текст</label>
        <input
          type="text"
          value={block.payload?.ctaLabelSecondary || ""}
          onChange={(event) => onUpdate(block.id, "ctaLabelSecondary", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">CTA 2 ссылка</label>
        <input
          type="text"
          value={block.payload?.ctaHrefSecondary || ""}
          onChange={(event) => onUpdate(block.id, "ctaHrefSecondary", event.target.value)}
          className="editor-canvas-input"
        />
      </div>
    </div>
  );
}

function HeroVisualEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const overlayOpacity = typeof block.payload?.overlayOpacity === "number" ? block.payload.overlayOpacity : 72;

  return (
    <div className="editor-canvas-prop-group">
      <div className="editor-canvas-subhead">Визуал Hero</div>
      <ImageUploadControl
        label="Фоновое изображение"
        value={block.payload?.backgroundImageUrl || ""}
        onChange={(value) => onUpdate(block.id, "backgroundImageUrl", value)}
      />
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Затемнение фона: {overlayOpacity}%</label>
        <input
          className="editor-canvas-range"
          type="range"
          min={20}
          max={90}
          step={1}
          value={overlayOpacity}
          onChange={(event) => onUpdate(block.id, "overlayOpacity", Number(event.target.value))}
        />
      </div>
      <ImageUploadControl
        label="Правое фото"
        value={block.payload?.photoUrl || ""}
        onChange={(value) => onUpdate(block.id, "photoUrl", value)}
      />
    </div>
  );
}

function MetricsEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const metrics = (block.payload?.metrics ?? []) as ProposalMetric[];

  return (
    <ArraySection
      title="Метрики"
      onAdd={() => onUpdate(block.id, "metrics", [...metrics, { value: "", label: "" }])}
    >
      {metrics.map((metric, index) => (
        <div className="editor-canvas-array-card" key={`metric-${index}`}>
          <div className="editor-canvas-array-head">
            <span>Метрика {index + 1}</span>
            <button
              type="button"
              className="editor-canvas-action-btn editor-canvas-action-del"
              onClick={() => onUpdate(block.id, "metrics", metrics.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            placeholder="Значение"
            value={metric.value}
            onChange={(event) => {
              const updated = [...metrics];
              updated[index] = { ...updated[index], value: event.target.value };
              onUpdate(block.id, "metrics", updated);
            }}
            className="editor-canvas-input editor-canvas-input-small"
          />
          <input
            type="text"
            placeholder="Описание"
            value={metric.label}
            onChange={(event) => {
              const updated = [...metrics];
              updated[index] = { ...updated[index], label: event.target.value };
              onUpdate(block.id, "metrics", updated);
            }}
            className="editor-canvas-input editor-canvas-input-small"
          />
        </div>
      ))}
    </ArraySection>
  );
}

function PhotosEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const photos = (block.payload?.photos ?? []) as GalleryPhoto[];

  return (
    <ArraySection
      title="Фото"
      onAdd={() => onUpdate(block.id, "photos", [...photos, { url: "", meta: "", caption: "" }])}
    >
      {photos.map((photo, index) => (
        <div className="editor-canvas-array-card" key={`photo-${index}`}>
          <div className="editor-canvas-array-head">
            <span>Фото {index + 1}</span>
            <button
              type="button"
              className="editor-canvas-action-btn editor-canvas-action-del"
              onClick={() => onUpdate(block.id, "photos", photos.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="URL изображения"
            value={photo.url ?? ""}
            onChange={(event) => {
              const updated = [...photos];
              updated[index] = { ...updated[index], url: event.target.value };
              onUpdate(block.id, "photos", updated);
            }}
          />
          <ImageUploadControl
            label="Загрузка фото"
            value={photo.url ?? ""}
            compact
            onChange={(value) => {
              const updated = [...photos];
              updated[index] = { ...updated[index], url: value };
              onUpdate(block.id, "photos", updated);
            }}
          />
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="Meta"
            value={photo.meta ?? ""}
            onChange={(event) => {
              const updated = [...photos];
              updated[index] = { ...updated[index], meta: event.target.value };
              onUpdate(block.id, "photos", updated);
            }}
          />
          <textarea
            className="editor-canvas-textarea editor-canvas-textarea-small"
            placeholder="Подпись"
            value={photo.caption ?? ""}
            onChange={(event) => {
              const updated = [...photos];
              updated[index] = { ...updated[index], caption: event.target.value };
              onUpdate(block.id, "photos", updated);
            }}
          />
        </div>
      ))}
    </ArraySection>
  );
}

function VideoEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  return (
    <div className="editor-canvas-grid-2">
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Ссылка на видео</label>
        <input
          className="editor-canvas-input"
          value={block.payload?.videoUrl ?? ""}
          onChange={(event) => onUpdate(block.id, "videoUrl", event.target.value)}
        />
      </div>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Постер (URL)</label>
        <input
          className="editor-canvas-input"
          value={block.payload?.videoPoster ?? ""}
          onChange={(event) => onUpdate(block.id, "videoPoster", event.target.value)}
        />
      </div>
      <ImageUploadControl
        label="Постер: загрузка"
        value={block.payload?.videoPoster ?? ""}
        onChange={(value) => onUpdate(block.id, "videoPoster", value)}
      />
      <div className="editor-canvas-prop-group editor-canvas-grid-span-2">
        <label className="editor-canvas-label">Meta подпись</label>
        <input
          className="editor-canvas-input"
          value={block.payload?.videoMeta ?? ""}
          onChange={(event) => onUpdate(block.id, "videoMeta", event.target.value)}
        />
      </div>
    </div>
  );
}

function BeforeAfterEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  return (
    <>
      <div className="editor-canvas-grid-2">
        <div className="editor-canvas-prop-group">
          <label className="editor-canvas-label">Было: заголовок</label>
          <input
            type="text"
            value={block.payload?.beforeTitle || ""}
            onChange={(event) => onUpdate(block.id, "beforeTitle", event.target.value)}
            className="editor-canvas-input"
          />
        </div>
        <div className="editor-canvas-prop-group">
          <label className="editor-canvas-label">Стало: заголовок</label>
          <input
            type="text"
            value={block.payload?.afterTitle || ""}
            onChange={(event) => onUpdate(block.id, "afterTitle", event.target.value)}
            className="editor-canvas-input"
          />
        </div>
      </div>
      <LineListEditor
        title="Было: пункты"
        value={(block.payload?.beforeItems ?? []).join("\n")}
        onChange={(value) => onUpdate(block.id, "beforeItems", parseLines(value))}
      />
      <LineListEditor
        title="Стало: пункты"
        value={(block.payload?.afterItems ?? []).join("\n")}
        onChange={(value) => onUpdate(block.id, "afterItems", parseLines(value))}
      />
    </>
  );
}

function TimelineEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const steps = (block.payload?.timelineSteps ?? []) as TimelineStep[];

  return (
    <ArraySection
      title="Этапы"
      onAdd={() => onUpdate(block.id, "timelineSteps", [...steps, { index: "Этап", title: "", body: "" }])}
    >
      {steps.map((step, index) => (
        <div className="editor-canvas-array-card" key={`step-${index}`}>
          <div className="editor-canvas-array-head">
            <span>Этап {index + 1}</span>
            <button
              type="button"
              className="editor-canvas-action-btn editor-canvas-action-del"
              onClick={() => onUpdate(block.id, "timelineSteps", steps.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="Индекс"
            value={step.index}
            onChange={(event) => {
              const updated = [...steps];
              updated[index] = { ...updated[index], index: event.target.value };
              onUpdate(block.id, "timelineSteps", updated);
            }}
          />
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="Заголовок"
            value={step.title}
            onChange={(event) => {
              const updated = [...steps];
              updated[index] = { ...updated[index], title: event.target.value };
              onUpdate(block.id, "timelineSteps", updated);
            }}
          />
          <textarea
            className="editor-canvas-textarea editor-canvas-textarea-small"
            placeholder="Описание"
            value={step.body ?? ""}
            onChange={(event) => {
              const updated = [...steps];
              updated[index] = { ...updated[index], body: event.target.value };
              onUpdate(block.id, "timelineSteps", updated);
            }}
          />
        </div>
      ))}
    </ArraySection>
  );
}

function CommercialEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const cards = (block.payload?.commercialCards ?? []) as CommercialCard[];

  return (
    <ArraySection
      title="Коммерческие карточки"
      onAdd={() => onUpdate(block.id, "commercialCards", [...cards, { label: "", price: "", meta: "", featured: false }])}
    >
      {cards.map((card, index) => (
        <div className="editor-canvas-array-card" key={`commercial-${index}`}>
          <div className="editor-canvas-array-head">
            <span>Карточка {index + 1}</span>
            <button
              type="button"
              className="editor-canvas-action-btn editor-canvas-action-del"
              onClick={() => onUpdate(block.id, "commercialCards", cards.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="Заголовок"
            value={card.label}
            onChange={(event) => {
              const updated = [...cards];
              updated[index] = { ...updated[index], label: event.target.value };
              onUpdate(block.id, "commercialCards", updated);
            }}
          />
          <input
            className="editor-canvas-input editor-canvas-input-small"
            placeholder="Цена"
            value={card.price ?? ""}
            onChange={(event) => {
              const updated = [...cards];
              updated[index] = { ...updated[index], price: event.target.value };
              onUpdate(block.id, "commercialCards", updated);
            }}
          />
          <textarea
            className="editor-canvas-textarea editor-canvas-textarea-small"
            placeholder="Описание"
            value={card.meta ?? ""}
            onChange={(event) => {
              const updated = [...cards];
              updated[index] = { ...updated[index], meta: event.target.value };
              onUpdate(block.id, "commercialCards", updated);
            }}
          />
          <div className="editor-canvas-row">
            <input
              type="checkbox"
              checked={Boolean(card.featured)}
              onChange={(event) => {
                const updated = [...cards];
                updated[index] = { ...updated[index], featured: event.target.checked };
                onUpdate(block.id, "commercialCards", updated);
              }}
              className="editor-canvas-checkbox"
            />
            <span className="editor-canvas-muted">Выделенная карточка</span>
          </div>
        </div>
      ))}
    </ArraySection>
  );
}

function ContactsEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  const contacts = (block.payload?.contacts ?? []) as ContactItem[];

  return (
    <>
      <div className="editor-canvas-prop-group">
        <label className="editor-canvas-label">Фото (URL)</label>
        <input
          className="editor-canvas-input"
          value={block.payload?.photoUrl ?? ""}
          onChange={(event) => onUpdate(block.id, "photoUrl", event.target.value)}
        />
      </div>
      <ImageUploadControl
        label="Фото: загрузка"
        value={block.payload?.photoUrl ?? ""}
        onChange={(value) => onUpdate(block.id, "photoUrl", value)}
      />

      <ArraySection
        title="Контакты"
        onAdd={() => onUpdate(block.id, "contacts", [...contacts, { label: "", value: "" }])}
      >
        {contacts.map((contact, index) => (
          <div className="editor-canvas-array-card" key={`contact-${index}`}>
            <div className="editor-canvas-array-head">
              <span>Контакт {index + 1}</span>
              <button
                type="button"
                className="editor-canvas-action-btn editor-canvas-action-del"
                onClick={() => onUpdate(block.id, "contacts", contacts.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
            <input
              className="editor-canvas-input editor-canvas-input-small"
              placeholder="Метка"
              value={contact.label}
              onChange={(event) => {
                const updated = [...contacts];
                updated[index] = { ...updated[index], label: event.target.value };
                onUpdate(block.id, "contacts", updated);
              }}
            />
            <input
              className="editor-canvas-input editor-canvas-input-small"
              placeholder="Значение"
              value={contact.value}
              onChange={(event) => {
                const updated = [...contacts];
                updated[index] = { ...updated[index], value: event.target.value };
                onUpdate(block.id, "contacts", updated);
              }}
            />
          </div>
        ))}
      </ArraySection>
    </>
  );
}

function CustomHtmlEditor({
  block,
  onUpdate,
}: {
  block: ProposalBlock;
  onUpdate: (blockId: string, key: string, value: unknown) => void;
}) {
  return (
    <div className="editor-canvas-prop-group">
      <label className="editor-canvas-label">Кастомный HTML</label>
      <textarea
        value={block.payload?.customHtml || ""}
        onChange={(event) => onUpdate(block.id, "customHtml", event.target.value)}
        className="editor-canvas-textarea"
        rows={7}
        placeholder="<section>Ваш HTML блок</section>"
      />
    </div>
  );
}

function ImageUploadControl({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file?: File | null) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const url = await uploadImageFile(file);
        onChange(url);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  return (
    <div
      className={`editor-canvas-upload ${compact ? "compact" : ""} ${dragOver ? "drag-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        handleFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="editor-canvas-upload-head">
        <span>{label}</span>
        <span>{isUploading ? "Загрузка..." : "drag & drop"}</span>
      </div>
      {value ? (
        <div className="editor-canvas-upload-preview">
          <img src={value} alt="preview" />
        </div>
      ) : (
        <div className="editor-canvas-upload-empty">Перетащи изображение сюда или выбери файл</div>
      )}
      <div className="editor-canvas-upload-actions">
        <button type="button" className="editor-canvas-btn-small" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          Выбрать файл
        </button>
        {value ? (
          <button type="button" className="editor-canvas-btn-small editor-canvas-btn-small-danger" onClick={() => onChange("")}>
            Очистить
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function LineListEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="editor-canvas-prop-group">
      <label className="editor-canvas-label">{title}</label>
      <textarea
        className="editor-canvas-textarea"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Один пункт на строку"
      />
    </div>
  );
}

function ArraySection({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="editor-canvas-prop-group">
      <div className="editor-canvas-subhead">
        <span>{title}</span>
        <button type="button" className="editor-canvas-btn-small" onClick={onAdd}>
          +
        </button>
      </div>
      <div className="editor-canvas-array-list">{children}</div>
    </div>
  );
}

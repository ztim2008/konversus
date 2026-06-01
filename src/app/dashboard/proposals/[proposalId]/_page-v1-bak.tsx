import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ActiveBlockEditor } from "@/components/builder/active-block-editor";
import {
  addProposalBlockAction,
  moveProposalBlockAction,
  publishShareLinkAction,
  removeProposalBlockAction,
  updateProposalMetaAction,
} from "@/app/dashboard/proposals/[proposalId]/actions";
import { requireCurrentAdmin } from "@/lib/auth/session";
import { getCompany } from "@/lib/data/companies";
import { getProposal } from "@/lib/data/proposals";
import { getShareLinkForProposal, getSharePath } from "@/lib/data/share-links";
import {
  getProposalBlockCategory,
  getProposalBlockLabel,
  getRecommendedNextBlockTemplates,
  normalizeProposalBlocks,
  proposalBlockTemplates,
} from "@/lib/proposal-builder";
import { proposalStatuses } from "@/types/domain";

type ProposalEditorPageProps = {
  params: Promise<{ proposalId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CatalogState = "all" | "used" | "unused";
type PanelMode = "block" | "concept" | "publish";
type SidebarMode = "structure" | "library";

const proposalStatusLabels: Record<string, string> = {
  draft: "Черновик",
  sent: "Отправлено",
  won: "Сделка ✓",
  archived: "Архив",
} as const;

const catalogCategoryAliases = {
  Открытие: "opening",
  Контекст: "context",
  Стратегия: "strategy",
  Аудит: "audit",
  SEO: "seo",
  Доверие: "trust",
  Процесс: "process",
  Архитектура: "architecture",
  Медиа: "media",
  Коммерция: "commerce",
  Производство: "production",
  Закрытие: "closing",
} as const;

function getSearchValue(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function getPanelMode(value?: string, hasActiveBlock?: boolean): PanelMode {
  if (value === "block" || value === "concept" || value === "publish") {
    return value;
  }

  return hasActiveBlock ? "block" : "concept";
}

function getSidebarMode(value?: string): SidebarMode {
  return value === "library" ? "library" : "structure";
}

function buildEditorHref(proposalId: string, options?: {
  blockId?: string;
  panel?: PanelMode;
  sidebar?: SidebarMode;
  category?: string | null;
  state?: CatalogState;
}) {
  const searchParams = new URLSearchParams();

  if (options?.blockId) {
    searchParams.set("block", options.blockId);
  }

  if (options?.panel) {
    searchParams.set("panel", options.panel);
  }

  if (options?.sidebar && options.sidebar !== "structure") {
    searchParams.set("sidebar", options.sidebar);
  }

  if (options?.category) {
    searchParams.set("catalog", options.category);
  }

  if (options?.state && options.state !== "all") {
    searchParams.set("catalogState", options.state);
  }

  const query = searchParams.toString();
  const path = `/dashboard/proposals/${proposalId}`;
  const anchor = options?.blockId ? `#block-${options.blockId}` : options?.category || options?.state ? "#catalog" : "";

  return query ? `${path}?${query}${anchor}` : `${path}${anchor}`;
}

function getActiveBlockId(blocks: ReturnType<typeof normalizeProposalBlocks>, selectedBlockId?: string) {
  if (!blocks.length) {
    return null;
  }

  if (selectedBlockId && blocks.some((block) => block.id === selectedBlockId)) {
    return selectedBlockId;
  }

  return blocks[0].id;
}

function getCategoryToneClass(category: string) {
  switch (catalogCategoryAliases[category as keyof typeof catalogCategoryAliases]) {
    case "opening":
      return "builder-category-opening";
    case "context":
      return "builder-category-context";
    case "strategy":
      return "builder-category-strategy";
    case "audit":
      return "builder-category-audit";
    case "seo":
      return "builder-category-seo";
    case "trust":
      return "builder-category-trust";
    case "process":
      return "builder-category-process";
    case "architecture":
      return "builder-category-architecture";
    case "media":
      return "builder-category-media";
    case "commerce":
      return "builder-category-commerce";
    case "production":
      return "builder-category-production";
    case "closing":
      return "builder-category-closing";
    default:
      return "builder-category-trust";
  }
}

function groupTemplatesByCategory() {
  return proposalBlockTemplates.reduce<Record<string, typeof proposalBlockTemplates>>((groups, template) => {
    if (!groups[template.category]) {
      groups[template.category] = [];
    }

    groups[template.category].push(template);
    return groups;
  }, {});
}

type QuickInsertProps = {
  proposalId: string;
  insertAfterIndex: number;
  recommendedTemplates: typeof proposalBlockTemplates;
  templateGroups: Record<string, typeof proposalBlockTemplates>;
  title: string;
  sidebarMode: SidebarMode;
};

function QuickInsert({
  proposalId,
  insertAfterIndex,
  recommendedTemplates,
  templateGroups,
  title,
  sidebarMode,
}: QuickInsertProps) {
  return (
    <div className="builder-insert-zone p-4">
      <div className="builder-kicker">{title}</div>
      <div className="builder-subtle-copy mt-3 text-sm">Новые блоки добавляются здесь, а затем переставляются перетаскиванием в нужное место.</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {recommendedTemplates.map((template) => (
          <form key={`recommended-${insertAfterIndex}-${template.type}`} action={addProposalBlockAction}>
            <input type="hidden" name="proposalId" value={proposalId} />
            <input type="hidden" name="blockType" value={template.type} />
            <input type="hidden" name="insertAfterIndex" value={String(insertAfterIndex)} />
            <input type="hidden" name="panel" value="block" />
            <input type="hidden" name="sidebar" value={sidebarMode} />
            <button className="builder-chip" type="submit">
              + {template.label}
            </button>
          </form>
        ))}
      </div>
      <details className="builder-panel builder-panel-soft mt-4 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Открыть весь каталог для этой точки
        </summary>
        <div className="mt-4 grid gap-4">
          {Object.entries(templateGroups).map(([category, templates]) => (
            <section key={`${insertAfterIndex}-${category}`} className="builder-panel builder-panel-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <div className={`builder-category-band ${getCategoryToneClass(category)}`}>{category}</div>
                <div className="builder-kicker text-[10px]">{templates.length} блоков</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {templates.map((template) => (
                  <form key={`${insertAfterIndex}-${category}-${template.type}`} action={addProposalBlockAction}>
                    <input type="hidden" name="proposalId" value={proposalId} />
                    <input type="hidden" name="blockType" value={template.type} />
                    <input type="hidden" name="insertAfterIndex" value={String(insertAfterIndex)} />
                    <input type="hidden" name="panel" value="block" />
                    <input type="hidden" name="sidebar" value={sidebarMode} />
                    <button className="builder-action-secondary" type="submit">
                      + {template.label}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}

export default async function ProposalEditorPage({ params, searchParams }: ProposalEditorPageProps) {
  await requireCurrentAdmin();

  const { proposalId } = await params;
  const query = await searchParams;
  const proposal = await getProposal(proposalId);

  if (!proposal) {
    notFound();
  }

  const company = await getCompany(proposal.companyId);

  if (!company) {
    notFound();
  }

  const shareLink = await getShareLinkForProposal(proposalId);
  const headerStore = await headers();
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const host = headerStore.get("host") ?? "konversus.ru";
  const sharePath = shareLink ? getSharePath(shareLink) : null;
  const shareUrl = sharePath ? `${protocol}://${host}${sharePath}` : null;
  const blocks = normalizeProposalBlocks(proposal.structure);
  const templateGroups = groupTemplatesByCategory();
  const error = getSearchValue(query, "error");
  const message = getSearchValue(query, "message");
  const selectedBlockId = getSearchValue(query, "block");
  const selectedCategory = getSearchValue(query, "catalog");
  const selectedState = (getSearchValue(query, "catalogState") as CatalogState | undefined) ?? "all";
  const sidebarMode = getSidebarMode(getSearchValue(query, "sidebar"));
  const activeBlockId = getActiveBlockId(blocks, selectedBlockId);
  const activeBlock = activeBlockId ? blocks.find((block) => block.id === activeBlockId) ?? null : null;
  const panelMode = getPanelMode(getSearchValue(query, "panel"), Boolean(activeBlock));
  const usedBlockTypes = new Set(blocks.map((block) => block.type));
  const filteredTemplateGroups = Object.entries(templateGroups).reduce<Record<string, typeof proposalBlockTemplates>>((accumulator, [category, templates]) => {
    if (selectedCategory && selectedCategory !== category) {
      return accumulator;
    }

    const nextTemplates = templates.filter((template) => {
      if (selectedState === "used") {
        return usedBlockTypes.has(template.type);
      }

      if (selectedState === "unused") {
        return !usedBlockTypes.has(template.type);
      }

      return true;
    });

    if (nextTemplates.length > 0) {
      accumulator[category] = nextTemplates;
    }

    return accumulator;
  }, {});
  const totalCatalogTemplates = Object.values(filteredTemplateGroups).reduce((count, templates) => count + templates.length, 0);

  return (
    <main className="builder-shell editor-shell mx-auto flex w-full max-w-[1760px] flex-1 flex-col px-3 pb-8 pt-3 sm:px-5 lg:px-6">
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <Link className="editor-brand" href="/dashboard">Factory Proposal Builder</Link>
          <span className="editor-topbar-sep">/</span>
          <div>
            <div className="editor-topbar-title">{proposal.title}</div>
            <div className="editor-topbar-subtitle">{company.name}</div>
          </div>
        </div>
        <div className="editor-topbar-right">
          <Link className={panelMode === "block" ? "editor-topbar-button editor-topbar-button-active" : "editor-topbar-button"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "block", sidebar: sidebarMode, category: selectedCategory ?? null, state: selectedState })}>
            Блок
          </Link>
          <Link className={panelMode === "concept" ? "editor-topbar-button editor-topbar-button-active" : "editor-topbar-button"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "concept", sidebar: sidebarMode, category: selectedCategory ?? null, state: selectedState })}>
            Концепт
          </Link>
          <Link className={panelMode === "publish" ? "editor-topbar-button editor-topbar-button-active" : "editor-topbar-button"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "publish", sidebar: sidebarMode, category: selectedCategory ?? null, state: selectedState })}>
            Публикация
          </Link>
          {shareUrl ? (
            <a className="editor-topbar-button editor-topbar-button-primary" href={shareUrl} target="_blank" rel="noreferrer">
              Открыть
            </a>
          ) : null}
        </div>
      </header>

      <section className="editor-workspace">
        <aside className="editor-side editor-side-left">
          {/* Структура — первичная навигация */}
          <section className="editor-panel">
            <div className="editor-panel-head">Структура страницы</div>
            <div className="editor-structure-list mt-3">
              {blocks.length === 0 ? (
                <div className="editor-empty">Пока пусто. Добавьте первый блок ниже.</div>
              ) : (
                blocks.map((block, index) => (
                  <Link
                    key={block.id}
                    className={block.id === activeBlockId && panelMode === "block" ? "editor-structure-row editor-structure-row-active" : "editor-structure-row"}
                    href={buildEditorHref(proposalId, { blockId: block.id, panel: "block", sidebar: "structure", category: selectedCategory ?? null, state: selectedState })}
                  >
                    <div className="editor-structure-order">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="editor-structure-title">{getProposalBlockLabel(block.type)}</div>
                      <div className="editor-structure-meta">{getProposalBlockCategory(block.type)}</div>
                    </div>
                    <div className={block.visible ? "editor-structure-state editor-structure-state-visible" : "editor-structure-state"}>
                      {block.visible ? "on" : "off"}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Каталог — добавить блок */}
          <section className="editor-panel mt-4">
            <div className="editor-panel-head">Добавить блок</div>
            <div className="editor-filter-row mt-3">
              <Link className={!selectedCategory ? "builder-chip-active" : "builder-chip-muted"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: panelMode, sidebar: "library", category: null, state: "all" })}>
                Все
              </Link>
              {Object.keys(templateGroups).map((category) => (
                <Link key={category} className={selectedCategory === category ? "builder-chip-active" : "builder-chip-muted"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: panelMode, sidebar: "library", category, state: "all" })}>
                  {category}
                </Link>
              ))}
            </div>
            <div className="editor-catalog-grid mt-4">
              {Object.entries(filteredTemplateGroups).map(([category, templates]) => (
                <section key={category} className="editor-mini-group">
                  <div className="editor-mini-group-head">
                    <div className={`builder-category-band ${getCategoryToneClass(category)}`}>{category}</div>
                    <div className="editor-mini-count">{templates.length}</div>
                  </div>
                  <div className="editor-mini-list">
                    {templates.map((template) => (
                      <form key={template.type} action={addProposalBlockAction} className="editor-catalog-row">
                        <input type="hidden" name="proposalId" value={proposalId} />
                        <input type="hidden" name="blockType" value={template.type} />
                        <input type="hidden" name="panel" value="block" />
                        <input type="hidden" name="sidebar" value="structure" />
                        <div>
                          <div className="editor-catalog-label">{template.label}</div>
                          <div className="editor-catalog-copy">{template.description}</div>
                        </div>
                        <button className="editor-add-button" type="submit">+</button>
                      </form>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </aside>

        <section className="editor-canvas-stage">
          {error ? <div className="builder-note builder-note-error">{error}</div> : null}
          {message ? <div className="builder-note builder-note-success">{message}</div> : null}

          <div className="editor-iframe-wrap">
            <div className="editor-iframe-toolbar">
              {shareUrl ? (
                <span className="editor-iframe-url">{shareUrl}</span>
              ) : (
                <span className="editor-iframe-url">Опубликуйте концепт для предпросмотра</span>
              )}
              {shareUrl && (
                <a
                  className="editor-iframe-btn editor-iframe-btn--accent"
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть ↗
                </a>
              )}
            </div>
            <div className="editor-iframe-scale">
              {shareUrl ? (
                <iframe
                  src={shareUrl}
                  className="editor-iframe"
                  title="Предпросмотр концепта"
                />
              ) : (
                <div style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-plex-mono), monospace", fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", padding: "48px 24px", textAlign: "center" }}>
                  Сначала опубликуйте концепт через правую панель — появится iframe-предпросмотр
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="editor-side editor-side-right">
          <div className="editor-panel editor-panel-right">
            <div className="mt-0 flex flex-wrap gap-2">
              <Link className={panelMode === "block" ? "builder-chip-active" : "builder-chip-muted"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "block", sidebar: "structure", category: selectedCategory ?? null, state: selectedState })}>
                Блок
              </Link>
              <Link className={panelMode === "concept" ? "builder-chip-active" : "builder-chip-muted"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "concept", sidebar: "structure", category: selectedCategory ?? null, state: selectedState })}>
                Концепт
              </Link>
              <Link className={panelMode === "publish" ? "builder-chip-active" : "builder-chip-muted"} href={buildEditorHref(proposalId, { blockId: activeBlockId ?? undefined, panel: "publish", sidebar: "structure", category: selectedCategory ?? null, state: selectedState })}>
                Публикация
              </Link>
            </div>

          {panelMode === "block" ? (
            <div className="mt-5 grid gap-4">
              {activeBlock ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <form action={moveProposalBlockAction}>
                      <input type="hidden" name="proposalId" value={proposalId} />
                      <input type="hidden" name="blockId" value={activeBlock.id} />
                      <input type="hidden" name="direction" value="up" />
                      <input type="hidden" name="panel" value="block" />
                      <input type="hidden" name="sidebar" value="structure" />
                      <button className="builder-action-secondary" type="submit">Вверх</button>
                    </form>
                    <form action={moveProposalBlockAction}>
                      <input type="hidden" name="proposalId" value={proposalId} />
                      <input type="hidden" name="blockId" value={activeBlock.id} />
                      <input type="hidden" name="direction" value="down" />
                      <input type="hidden" name="panel" value="block" />
                      <input type="hidden" name="sidebar" value="structure" />
                      <button className="builder-action-secondary" type="submit">Вниз</button>
                    </form>
                    <form action={removeProposalBlockAction}>
                      <input type="hidden" name="proposalId" value={proposalId} />
                      <input type="hidden" name="blockId" value={activeBlock.id} />
                      <input type="hidden" name="panel" value="block" />
                      <input type="hidden" name="sidebar" value="structure" />
                      <button className="builder-action-danger" type="submit">Удалить</button>
                    </form>
                  </div>

                  <ActiveBlockEditor proposalId={proposalId} block={activeBlock} index={blocks.findIndex((block) => block.id === activeBlock.id)} sidebar="structure" />
                </>
              ) : (
                <div className="builder-empty p-4 text-sm text-slate-400">
                  Выберите блок слева или кликните по карточке на канвасе. Здесь откроется инспектор его полей.
                </div>
              )}
            </div>
          ) : null}

          {panelMode === "concept" ? (
            <form action={updateProposalMetaAction} className="mt-5 grid gap-4">
              <input type="hidden" name="proposalId" value={proposalId} />
              <input type="hidden" name="panel" value="concept" />
              <input type="hidden" name="sidebar" value="structure" />
              <div className="builder-preview-card p-4">
                <div className="builder-kicker text-amber-100/80">Свойства страницы</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">
                  Это общие поля концепта: название, главный заголовок, статус и CTA всей страницы.
                </div>
              </div>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Название концепта</span>
                <input className="builder-field" name="title" defaultValue={proposal.title} required />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Главный заголовок</span>
                <input className="builder-field" name="headline" defaultValue={proposal.headline ?? ""} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Подпись кнопки</span>
                <input className="builder-field" name="ctaLabel" defaultValue={proposal.ctaLabel ?? ""} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Подзаголовок</span>
                <textarea className="builder-area min-h-28" name="subheadline" defaultValue={proposal.subheadline ?? ""} />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="mb-2 block">Статус</span>
                <select className="builder-select" name="status" defaultValue={proposal.status}>
                  {proposalStatuses.map((status) => (
                    <option key={status} value={status}>
                      {proposalStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="builder-action-primary w-full" type="submit">Сохранить свойства</button>
            </form>
          ) : null}

          {panelMode === "publish" ? (
            <div className="mt-5 grid gap-4">
              <div className="builder-preview-card p-4">
                <div className="builder-kicker text-amber-100/80">Публикация</div>
                <div className="mt-3 text-lg font-semibold text-white">Клиентская страница</div>
                <p className="builder-compact-copy mt-3">
                  Здесь хранится публикация, ссылка и текущий статус отдачи концепта наружу.
                </p>
              </div>

              {shareUrl ? (
                <div className="builder-panel builder-panel-strong p-4 text-sm text-slate-100">
                  <div className="builder-kicker text-amber-100/80">Активная ссылка</div>
                  <div className="mt-3 break-all">{shareUrl}</div>
                  <div className="mt-3 text-xs text-slate-300">Просмотров: {shareLink?.viewCount ?? 0}</div>
                </div>
              ) : (
                <div className="builder-empty p-4 text-sm text-slate-400">
                  Ссылка еще не опубликована. После публикации здесь появится клиентский URL.
                </div>
              )}

              <form action={async (fd: FormData) => { await publishShareLinkAction(fd); }}>
                <input type="hidden" name="proposalId" value={proposalId} />
                <input type="hidden" name="panel" value="publish" />
                <input type="hidden" name="sidebar" value="structure" />
                <button className="builder-action-primary w-full" type="submit">
                  {shareUrl ? "Обновить и открыть клиентскую страницу" : "Опубликовать клиентскую страницу"}
                </button>
              </form>
            </div>
          ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
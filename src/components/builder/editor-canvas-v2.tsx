"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TiptapEditor } from "./tiptap-editor";

import { createHeroVariantBlock, createProposalBlock } from "@/lib/proposal-builder";
import { renderProposalHtml } from "@/lib/proposal-html-renderer";
import type { ContactItem, GalleryPhoto, ProposalBlock, ProposalBlockPayload, ProposalMetric } from "@/types/domain";

type EditorCanvasV2Props = {
  blocks: ProposalBlock[];
  shareUrl: string | null;
  saveState?: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: string | null;
  onBlocksChange: (blocks: ProposalBlock[]) => void;
  onDraftBlocksChange?: (blocks: ProposalBlock[]) => void;
};

type PreviewMode = "desktop" | "mobile";
type MediaTarget = "backgroundImageUrl" | "photoUrl" | "videoPoster";
type MediaModalTarget = MediaTarget | `gallery:${number}`;
type HeroVariant = NonNullable<ProposalBlockPayload["heroVariant"]>;
type InsertableBlockType = "metrics" | "editorial" | "gallery-showcase" | "video-block" | "gallery-photo" | "custom-html" | "cta" | "rich-text" | "section-heading" | "doc-agency-pitch";

type MediaItem = {
  id: string;
  kind: "image" | "video";
  name: string;
  url: string;
};

async function uploadImageFile(file: File) {
  const form = new FormData();
  form.append("image", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error ?? "Ошибка загрузки файла");
  }

  const json = await response.json() as { url: string };
  return json.url;
}

function getEditableBlocks(blocks: ProposalBlock[]) {
  return blocks.filter((block) => block.visible !== false);
}

function blocksSignature(blocks: ProposalBlock[]) {
  return JSON.stringify(blocks);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function cssUrl(value: string) {
  return value ? `url(${JSON.stringify(value)})` : "";
}

function getBlockLabel(block: ProposalBlock) {
  if (block.type === "hero") return block.title || "Hero";
  if (block.type === "metrics") return "Факты / Метрики";
  if (block.type === "editorial") return "Текст + фото";
  if (block.type === "gallery-showcase") return "Фото 100%";
  if (block.type === "video-block") return "Видео 100%";
  if (block.type === "gallery-photo") return "Галерея 6 фото";
  if (block.type === "custom-html") return "HTML-вставка";
  if (block.type === "cta") return "Контакты";
  return block.title || block.type;
}

function cloneBlock(block: ProposalBlock) {
  return {
    ...block,
    id: `${block.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: block.title ? `${block.title} копия` : block.title,
    payload: JSON.parse(JSON.stringify(block.payload ?? {})) as ProposalBlockPayload,
    visible: true,
  } satisfies ProposalBlock;
}

function createEditorBlock(type: InsertableBlockType) {
  const block = createProposalBlock(type);

  if (type === "metrics") {
    return {
      ...block,
      title: "Факты / Метрики",
      payload: {
        ...block.payload,
        backgroundColor: "#f3efe7",
        textColor: "#15191f",
        headline: "Факты, которые быстро фиксируют масштаб компании",
        body: "Короткая доказательная секция после первого экрана: цифры, которые снимают сомнения и помогают перейти к деталям.",
        metrics: [
          { value: "14", label: "лет в производстве и проектировании" },
          { value: "18 000 м2", label: "площадь производственной базы" },
          { value: "320+", label: "реализованных объектов" },
        ],
      },
    } satisfies ProposalBlock;
  }

  if (type === "editorial") {
    return {
      ...block,
      title: "Текст + фото",
      payload: {
        ...block.payload,
        backgroundColor: "#ffffff",
        textColor: "#171d24",
        headline: "Показываем производство через понятный коммерческий контекст",
        body: "Блок на всю ширину соединяет объяснение и один сильный кадр: удобно раскрывать подход, задачу, продуктовую линейку или ценность проекта.",
        photoUrl: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1400&q=80",
      },
    } satisfies ProposalBlock;
  }

  if (type === "custom-html") {
    return {
      ...block,
      title: "HTML-вставка",
      payload: {
        ...block.payload,
        customHtml: "<section style=\"padding:64px;background:#111820;color:#f7f2ea;font-family:Montserrat,Inter,sans-serif\"><h2 style=\"margin:0 0 16px;font-size:48px;line-height:1\">AI HTML block</h2><p style=\"margin:0;max-width:680px;font-size:20px;line-height:1.55\">Вставьте сюда HTML-код, который подготовил ИИ.</p></section>",
      },
    } satisfies ProposalBlock;
  }

  if (type === "rich-text") {
    return {
      ...block,
      title: "Текстовый блок",
      payload: {
        ...block.payload,
        eyebrow: "",
        richTextHtml: "<h2>Заголовок блока</h2><p>Здесь можно писать <strong>жирный</strong>, <em>курсив</em>, списки, вставлять фото и видео.</p>",
        backgroundColor: "",
        textColor: "",
      },
    } satisfies ProposalBlock;
  }

  if (type === "gallery-showcase") {
    return {
      ...block,
      title: "Фото 100%",
      payload: {
        ...block.payload,
        photoUrl: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1800&q=80",
        body: "",
        backgroundColor: "#ffffff",
        textColor: "#171d24",
        captionDesktopSize: 16,
        captionMobileSize: 14,
      },
    } satisfies ProposalBlock;
  }

  if (type === "video-block") {
    return {
      ...block,
      title: "Видео 100%",
      payload: {
        ...block.payload,
        headline: "Видео показывает производство быстрее любого описания",
        body: "Полноширинный видео-блок можно использовать для презентации цеха, команды, оборудования или маршрута проекта.",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoPoster: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1800&q=80",
      },
    } satisfies ProposalBlock;
  }

  if (type === "section-heading") {
    return {
      ...block,
      title: "Заголовок-разделитель",
      payload: {
        ...block.payload,
        eyebrow: "Новый раздел",
        headline: "Заголовок раздела — чётко и без лишних слов",
        body: "Подзаголовок раскрывает контекст этого раздела документа.",
        headingAlign: "left" as const,
        headlineDesktopSize: 80,
        headlineMobileSize: 44,
        backgroundColor: "",
        textColor: "",
      },
    } satisfies ProposalBlock;
  }

  if (type === "doc-agency-pitch") {
    return {
      ...block,
      title: "Агентский питч",
    } satisfies ProposalBlock;
  }

  if (type === "gallery-photo") {
    return {
      ...block,
      title: "Галерея 6 фото",
      payload: {
        ...block.payload,
        headline: "Галерея показывает производство через серию коротких кадров",
        body: "До шести фото без пагинации: на desktop — плотная сетка, на мобильном — горизонтальная лента.",
        photos: [
          { url: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80", meta: "Кадр 01", caption: "Производственная сцена" },
          { url: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1200&q=80", meta: "Кадр 02", caption: "Оборудование и процесс" },
          { url: "https://images.unsplash.com/photo-1581091870632-130d5f571c2e?auto=format&fit=crop&w=1200&q=80", meta: "Кадр 03", caption: "Детали и контроль" },
        ],
      },
    } satisfies ProposalBlock;
  }

  return {
    ...block,
    title: "Контакты",
    payload: {
      ...block.payload,
      headline: "Обсудим ваш проект",
      body: "Пишите в любой мессенджер или звоните. Расскажу что именно можно сделать с вашим производством — бесплатный короткий разбор в любом формате.",
      photoUrl: "",
      contacts: [
        { label: "Телефон", value: "+7 921 201-32-52", href: "tel:+79212013252", meta: "Позвонить или написать SMS" },
        { label: "Telegram", value: "@bilarius", href: "https://t.me/bilarius", meta: "Быстрее всего отвечу здесь" },
        { label: "Max.ru (ВКонтакте)", value: "Написать в Max", href: "https://vk.me/bilarius", meta: "Альтернативный мессенджер" },
        { label: "Email", value: "bilariuss@yandex.ru", href: "mailto:bilariuss@yandex.ru" },
      ],
      ctaLabel: "Написать в Telegram",
      ctaHref: "https://t.me/bilarius",
      ctaLabelSecondary: "Позвонить",
      ctaHrefSecondary: "tel:+79212013252",
    },
  } satisfies ProposalBlock;
}

export function EditorCanvasV2({
  blocks,
  shareUrl,
  saveState = "idle",
  lastSavedAt = null,
  onBlocksChange,
  onDraftBlocksChange,
}: EditorCanvasV2Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSignatureRef = useRef(blocksSignature(blocks));
  const pendingPreviewScrollRef = useRef<number | null>(null);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const previewModeRef = useRef<PreviewMode>("desktop");
  const [iframeHeight, setIframeHeight] = useState(760);
  const [draftBlocks, setDraftBlocks] = useState<ProposalBlock[]>(blocks);
  const [previewHtml, setPreviewHtml] = useState(() => renderProposalHtml(getEditableBlocks(blocks)));
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaModalTarget, setMediaModalTarget] = useState<MediaModalTarget | null>(null);
  const [modalUploading, setModalUploading] = useState(false);
  const [richTextModalOpen, setRichTextModalOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(() => getEditableBlocks(blocks)[0]?.id ?? "");

  const selectedBlock = useMemo(
    () => draftBlocks.find((block) => block.id === selectedBlockId) ?? getEditableBlocks(draftBlocks)[0] ?? null,
    [draftBlocks, selectedBlockId]
  );
  const heroBlock = useMemo(() => draftBlocks.find((block) => block.type === "hero" && block.visible !== false) ?? null, [draftBlocks]);
  const editableBlocks = useMemo(() => getEditableBlocks(draftBlocks), [draftBlocks]);
  const selectedIndex = selectedBlock ? draftBlocks.findIndex((block) => block.id === selectedBlock.id) : -1;

  useEffect(() => {
    let active = true;

    fetch("/api/media-library", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        setMediaItems(Array.isArray(json?.items) ? json.items : []);
      })
      .catch(() => {
        if (active) setMediaItems([]);
      })
      .finally(() => {
        if (active) setMediaLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      if (event.data.type === "fpb:height") {
        setIframeHeight(Math.min(Math.max(Number(event.data.height) || 760, 520), 1800));
      }

      if (event.data.type === "fpb:select-block" && typeof event.data.blockId === "string") {
        setSelectedBlockId(event.data.blockId);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const signature = blocksSignature(draftBlocks);

    if (signature === lastPersistedSignatureRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      lastPersistedSignatureRef.current = signature;
      onBlocksChange(draftBlocks);
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draftBlocks, onBlocksChange]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const patchHeroFrame = useCallback((payload: ProposalBlockPayload) => {
    const document = iframeRef.current?.contentDocument;
    if (!document) return;

    const hero = document.querySelector<HTMLElement>(".fpb-hero");
    const headline = document.querySelector<HTMLElement>(".fpb-hero h1");
    const body = document.querySelector<HTMLElement>(".fpb-hero p");
    const photo = document.querySelector<HTMLImageElement>(".fpb-hero__photo");

    const overlay = clampNumber(payload.overlayOpacity, 20, 90, 72) / 100;
    hero?.style.setProperty("--hero-overlay", String(overlay));
    hero?.style.setProperty("--hero-overlay-soft", String(Math.max(overlay - 0.14, 0.32)));
    hero?.style.setProperty("--hero-title-desktop", `${clampNumber(payload.headlineDesktopSize, 32, 120, 56)}px`);
    hero?.style.setProperty("--hero-title-mobile", `${clampNumber(payload.headlineMobileSize, 26, 72, 34)}px`);
    hero?.style.setProperty("--hero-bg-color", String(payload.backgroundColor || "#0d1116"));
    hero?.style.setProperty("--hero-text-color", String(payload.textColor || "#f6f2ea"));

    if (payload.backgroundImageUrl) {
      hero?.style.setProperty("--hero-bg", cssUrl(String(payload.backgroundImageUrl)));
    } else {
      hero?.style.removeProperty("--hero-bg");
    }

    if (headline) headline.textContent = payload.headline || "Промышленная компания должна выглядеть убедительно с первого экрана";
    if (body) body.textContent = payload.body || "Собираем спокойный, дорогой первый экран: сильная формулировка, производственный фон и один визуальный акцент справа.";
    if (photo && payload.photoUrl && photo.getAttribute("src") !== payload.photoUrl) {
      photo.src = String(payload.photoUrl);
    }
  }, []);

  const patchPaletteFrame = useCallback(() => {
    // палитра удалена — noop
  }, []);

  // Прямой DOM-патч для блоков без специального patchFrame (section-heading, gallery-showcase и пр.)
  const patchBlockFrame = useCallback((blockId: string, block: ProposalBlock, patch: Partial<ProposalBlockPayload>) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const el = doc.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    if (!el) return;

    const merged = { ...block.payload, ...patch };

    // Цвета — применяются ко всем блокам
    if ("backgroundColor" in patch || "textColor" in patch) {
      const bg = merged.backgroundColor;
      const ink = merged.textColor;
      if (bg && /^#[0-9a-f]{3,8}$/i.test(bg)) el.style.setProperty("--block-bg", bg);
      else el.style.removeProperty("--block-bg");
      if (ink && /^#[0-9a-f]{3,8}$/i.test(ink)) el.style.setProperty("--block-ink", ink);
      else el.style.removeProperty("--block-ink");
    }

    if (block.type === "section-heading") {
      const clamp = (v: unknown, mn: number, mx: number, fb: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(Math.max(n, mn), mx) : fb;
      };
      if ("headlineDesktopSize" in patch || "headlineMobileSize" in patch ||
          "subheadlineDesktopSize" in patch || "subheadlineMobileSize" in patch) {
        const titleDesktop = `${clamp(merged.headlineDesktopSize, 32, 160, 80)}px`;
        const titleMobile  = `${clamp(merged.headlineMobileSize,  22, 100, 44)}px`;
        const subDesktop   = `${clamp(merged.subheadlineDesktopSize, 14, 40, 20)}px`;
        const subMobile    = `${clamp(merged.subheadlineMobileSize,  13, 28, 17)}px`;
        // Обновляем CSS-переменные на родителе (для корректности cascade)
        el.style.setProperty("--sh-title-desktop", titleDesktop);
        el.style.setProperty("--sh-title-mobile",  titleMobile);
        el.style.setProperty("--sh-sub-desktop",   subDesktop);
        el.style.setProperty("--sh-sub-mobile",    subMobile);
        // Напрямую ставим fontSize на дочерние элементы согласно текущему режиму просмотра
        const isMobile = previewModeRef.current === "mobile";
        const headlineEl = el.querySelector<HTMLElement>(".sh-headline");
        const subEl      = el.querySelector<HTMLElement>(".sh-sub");
        if (headlineEl) headlineEl.style.fontSize = isMobile ? titleMobile : titleDesktop;
        if (subEl)      subEl.style.fontSize      = isMobile ? subMobile   : subDesktop;
      }
      if ("headline" in patch) {
        const h = el.querySelector<HTMLElement>(".sh-headline");
        if (h) h.textContent = merged.headline || "";
      }
      if ("body" in patch) {
        const s = el.querySelector<HTMLElement>(".sh-sub");
        if (s) s.textContent = merged.body || "";
      }
      if ("eyebrow" in patch) {
        const k = el.querySelector<HTMLElement>(".sh-kicker");
        if (k) k.textContent = merged.eyebrow || "";
      }
      if ("headingAlign" in patch) {
        el.classList.remove("sh-block--left", "sh-block--center", "sh-block--right");
        el.classList.add(`sh-block--${merged.headingAlign || "left"}`);
      }
    }

    if (block.type === "gallery-showcase") {
      const clamp = (v: unknown, mn: number, mx: number, fb: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(Math.max(n, mn), mx) : fb;
      };
      if ("captionDesktopSize" in patch || "captionMobileSize" in patch) {
        el.style.setProperty("--gs-cap-desktop", `${clamp(merged.captionDesktopSize, 12, 40, 16)}px`);
        el.style.setProperty("--gs-cap-mobile",  `${clamp(merged.captionMobileSize,  12, 32, 14)}px`);
      }
    }
  }, []);

  const capturePreviewScroll = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    const frameDocument = iframeRef.current?.contentDocument;
    pendingPreviewScrollRef.current = frameWindow?.scrollY ?? frameDocument?.documentElement.scrollTop ?? null;
  }, []);

  const restorePreviewScroll = useCallback(() => {
    const scrollY = pendingPreviewScrollRef.current;
    if (scrollY === null) return;

    window.requestAnimationFrame(() => {
      iframeRef.current?.contentWindow?.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      pendingPreviewScrollRef.current = null;
    });
  }, []);

  const renderPreview = useCallback((nextBlocks: ProposalBlock[]) => {
    capturePreviewScroll();
    setPreviewHtml(renderProposalHtml(getEditableBlocks(nextBlocks), { mobile: previewModeRef.current === "mobile" }));
  }, [capturePreviewScroll]);

  const schedulePreviewRender = useCallback((nextBlocks: ProposalBlock[]) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      renderPreview(nextBlocks);
    }, 650);
  }, [renderPreview]);

  const commitBlocks = useCallback((nextBlocks: ProposalBlock[], immediateHtml = false) => {
    setDraftBlocks(nextBlocks);
    onDraftBlocksChange?.(nextBlocks);

    if (immediateHtml) {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      renderPreview(nextBlocks);
    } else {
      schedulePreviewRender(nextBlocks);
    }
  }, [onDraftBlocksChange, renderPreview, schedulePreviewRender]);

  const ensureHero = useCallback(() => {
    const nextHero = createProposalBlock("hero");
    setSelectedBlockId(nextHero.id);
    commitBlocks([nextHero], true);
  }, [commitBlocks]);

  const addBlock = useCallback((type: InsertableBlockType) => {
    const block = createEditorBlock(type);
    const insertAfterIndex = selectedIndex >= 0 ? selectedIndex : draftBlocks.length - 1;
    const nextBlocks = [...draftBlocks];
    nextBlocks.splice(insertAfterIndex + 1, 0, block);
    setSelectedBlockId(block.id);
    commitBlocks(nextBlocks, true);
  }, [commitBlocks, draftBlocks, selectedIndex]);

  const updateBlockPayload = useCallback((blockId: string, patch: Partial<ProposalBlockPayload>, immediateHtml = false) => {
    const currentBlock = draftBlocks.find((b) => b.id === blockId);
    const nextBlocks = draftBlocks.map((block) => block.id === blockId ? {
      ...block,
      payload: {
        ...block.payload,
        ...patch,
      },
    } : block);

    // Мгновенный DOM-патч в iframe без перезагрузки
    if (currentBlock) patchBlockFrame(blockId, currentBlock, patch);

    commitBlocks(nextBlocks, immediateHtml);
  }, [commitBlocks, draftBlocks, patchBlockFrame]);

  const removeBlock = useCallback((blockId: string) => {
    const blockIndex = draftBlocks.findIndex((block) => block.id === blockId);
    const nextBlocks = draftBlocks.filter((block) => block.id !== blockId);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(nextBlocks[Math.max(blockIndex - 1, 0)]?.id ?? nextBlocks[0]?.id ?? "");
    }
    commitBlocks(nextBlocks, true);
  }, [commitBlocks, draftBlocks, selectedBlockId]);

  const removeSelectedBlock = useCallback(() => {
    if (!selectedBlock) return;
    removeBlock(selectedBlock.id);
  }, [removeBlock, selectedBlock]);

  const duplicateBlock = useCallback((blockId: string) => {
    const source = draftBlocks.find((block) => block.id === blockId);
    if (!source) return;
    const copy = cloneBlock(source);
    const index = draftBlocks.findIndex((block) => block.id === blockId);
    const nextBlocks = [...draftBlocks];
    nextBlocks.splice(index + 1, 0, copy);
    setSelectedBlockId(copy.id);
    commitBlocks(nextBlocks, true);
  }, [commitBlocks, draftBlocks]);

  const duplicateSelectedBlock = useCallback(() => {
    if (!selectedBlock) return;
    duplicateBlock(selectedBlock.id);
  }, [duplicateBlock, selectedBlock]);

  const moveBlock = useCallback((blockId: string, direction: -1 | 1) => {
    const index = draftBlocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draftBlocks.length) return;

    const nextBlocks = [...draftBlocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, block);
    setSelectedBlockId(blockId);
    commitBlocks(nextBlocks, true);
  }, [commitBlocks, draftBlocks]);

  const moveSelectedBlock = useCallback((direction: -1 | 1) => {
    if (!selectedBlock) return;
    moveBlock(selectedBlock.id, direction);
  }, [moveBlock, selectedBlock]);

  const updateSelectedGalleryPhoto = useCallback((index: number, patch: Partial<GalleryPhoto>) => {
    if (!selectedBlock) return;
    const photos = [...(selectedBlock.payload.photos ?? [])].slice(0, 6);
    photos[index] = {
      url: photos[index]?.url ?? "",
      meta: photos[index]?.meta ?? `Кадр ${String(index + 1).padStart(2, "0")}`,
      caption: photos[index]?.caption ?? "",
      ...patch,
    };
    updateBlockPayload(selectedBlock.id, { photos });
  }, [selectedBlock, updateBlockPayload]);

  const setHeroVariant = useCallback((variant: HeroVariant) => {
    const nextHero = variant === "image-split" ? createProposalBlock("hero") : createHeroVariantBlock(variant);

    if (heroBlock) {
      nextHero.payload = {
        ...nextHero.payload,
        headline: heroBlock.payload.headline || nextHero.payload.headline,
        body: heroBlock.payload.body || nextHero.payload.body,
        photoUrl: heroBlock.payload.photoUrl || nextHero.payload.photoUrl,
        headlineDesktopSize: heroBlock.payload.headlineDesktopSize || nextHero.payload.headlineDesktopSize,
        headlineMobileSize: heroBlock.payload.headlineMobileSize || nextHero.payload.headlineMobileSize,
      };
    }

    setSelectedBlockId(nextHero.id);
    const nextBlocks = heroBlock
      ? draftBlocks.map((block) => block.id === heroBlock.id ? nextHero : block)
      : [nextHero, ...draftBlocks];
    commitBlocks(nextBlocks, true);
  }, [commitBlocks, draftBlocks, heroBlock]);

  const updateHeroPayload = useCallback(
    (key: keyof ProposalBlockPayload, value: unknown, immediateHtml = false) => {
      if (!heroBlock) return;

      const nextPayload = {
        ...heroBlock.payload,
        [key]: value,
      };
      const nextHero = {
        ...heroBlock,
        visible: true,
        payload: nextPayload,
      };

      patchHeroFrame(nextPayload);
      commitBlocks(draftBlocks.map((block) => block.id === heroBlock.id ? nextHero : block), immediateHtml);
    },
    [commitBlocks, draftBlocks, heroBlock, patchHeroFrame]
  );

  const resetToHero = useCallback(() => {
    const nextHero = heroBlock ? { ...heroBlock, visible: true } : createProposalBlock("hero");
    commitBlocks([nextHero], true);
  }, [commitBlocks, heroBlock]);

  const applyMediaToTarget = useCallback((target: MediaModalTarget, url: string) => {
    if (!selectedBlock) return;
    if (target.startsWith("gallery:")) {
      updateSelectedGalleryPhoto(Number(target.split(":")[1]), { url });
      setMediaModalTarget(null);
      return;
    }
    if (selectedBlock.type === "hero" && (target === "backgroundImageUrl" || target === "photoUrl" || target === "videoPoster")) {
      updateHeroPayload(target, url, true);
    } else if (target === "videoPoster") {
      updateBlockPayload(selectedBlock.id, { videoPoster: url });
    } else {
      updateBlockPayload(selectedBlock.id, { photoUrl: url });
    }
    setMediaModalTarget(null);
  }, [selectedBlock, updateBlockPayload, updateHeroPayload, updateSelectedGalleryPhoto]);

  const uploadModalImage = useCallback(async (file: File) => {
    if (!mediaModalTarget) return;

    setModalUploading(true);
    try {
      const url = await uploadImageFile(file);
      const item = {
        id: `uploaded-${Date.now()}`,
        kind: "image" as const,
        name: file.name,
        url,
      };
      setMediaItems((items) => [item, ...items]);
      applyMediaToTarget(mediaModalTarget, url);
    } finally {
      setModalUploading(false);
    }
  }, [applyMediaToTarget, mediaModalTarget]);

  const setPreviewModeWithFreshHtml = useCallback((mode: PreviewMode) => {
    previewModeRef.current = mode;
    setPreviewHtml(renderProposalHtml(getEditableBlocks(draftBlocks), { mobile: mode === "mobile" }));
    setPreviewMode(mode);
  }, [draftBlocks]);

  useEffect(() => {
    if (!richTextModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setRichTextModalOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [richTextModalOpen]);

  const applyPalette = useCallback(() => {
    // палитра удалена — noop
  }, []);

  const updateSelectedMetric = useCallback((index: number, key: keyof ProposalMetric, value: string) => {
    if (!selectedBlock) return;
    const metrics = [...(selectedBlock.payload.metrics ?? [])];
    metrics[index] = {
      value: metrics[index]?.value ?? "",
      label: metrics[index]?.label ?? "",
      [key]: value,
    };
    updateBlockPayload(selectedBlock.id, { metrics });
  }, [selectedBlock, updateBlockPayload]);

  const updateSelectedContact = useCallback((index: number, key: keyof ContactItem, value: string) => {
    if (!selectedBlock) return;
    const contacts = [...(selectedBlock.payload.contacts ?? [])];
    contacts[index] = {
      label: contacts[index]?.label ?? "",
      value: contacts[index]?.value ?? "",
      [key]: value,
    };
    updateBlockPayload(selectedBlock.id, { contacts });
  }, [selectedBlock, updateBlockPayload]);

  return (
    <div className="editor-v2-layout">
      <aside className="editor-v2-left">
        <div className="editor-v2-panel">
          <div className="editor-v2-panel-head">Блоки</div>
          <button type="button" className={`editor-v2-block-card ${selectedBlock?.type === "hero" ? "active" : ""}`} onClick={heroBlock ? () => setSelectedBlockId(heroBlock.id) : ensureHero}>
            <span>Hero</span>
            <small>Заголовок, подзаголовок, фон с затемнением и фото справа.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => setHeroVariant("color-photo-right")}>
            <span>Hero цвет + фото</span>
            <small>Цветной фон, управляемый цвет текста и фото справа.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => setHeroVariant("color-photo-left")}>
            <span>Hero фото + текст</span>
            <small>Фото слева, спокойное текстовое поле на цветном фоне.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("metrics")}>
            <span>Факты / Метрики</span>
            <small>3 крупные цифры для доверия и масштаба.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("editorial")}>
            <span>Текст + фото</span>
            <small>Секция на 100% ширины: объяснение и кадр.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("gallery-showcase")}>
            <span>Фото 100%</span>
            <small>Один большой кадр на всю ширину.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("video-block")}>
            <span>Видео 100%</span>
            <small>Полноширинное видео с постером.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("gallery-photo")}>
            <span>Галерея 6 фото</span>
            <small>Сетка до 6 фото, на мобильном листается вбок.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("custom-html")}>
            <span>HTML от ИИ</span>
            <small>Вставка готового HTML-кода блока.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("rich-text")}>
            <span>Текстовый редактор</span>
            <small>Жирный, курсив, списки, фото, видео — как в Word.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("section-heading")}>
            <span>Заголовок-разделитель</span>
            <small>Большой журнальный заголовок с подзаголовком и кикером.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("doc-agency-pitch")}>
            <span>Агентский питч</span>
            <small>Полный коммерческий питч: проблема, цифры, состав, FAQ и CTA.</small>
          </button>
          <button type="button" className="editor-v2-block-card" onClick={() => addBlock("cta")}>
            <span>Контакты + фото</span>
            <small>Финальный контактный блок с вашим фото.</small>
          </button>
        </div>

      </aside>

      <main className="editor-v2-center">
        <div className="editor-v2-toolbar">
          <div className="editor-v2-mode-switch" aria-label="Режим предпросмотра">
            <button
              type="button"
              className={previewMode === "desktop" ? "active" : ""}
              onClick={() => setPreviewModeWithFreshHtml("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={previewMode === "mobile" ? "active" : ""}
              onClick={() => setPreviewModeWithFreshHtml("mobile")}
            >
              Mobile
            </button>
          </div>
          <details className="editor-v2-layers-menu">
            <summary>Слои</summary>
            <div className="editor-v2-layers-popover">
              {editableBlocks.length ? editableBlocks.map((block, index) => (
                <div key={block.id} className={`editor-v2-layer-row ${selectedBlock?.id === block.id ? "active" : ""}`}>
                  <button type="button" className="editor-v2-layer-select" onClick={() => setSelectedBlockId(block.id)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{getBlockLabel(block)}</strong>
                  </button>
                  <div className="editor-v2-layer-actions" aria-label="Действия со слоем">
                    <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} aria-label="Поднять блок">↑</button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={index === editableBlocks.length - 1} aria-label="Опустить блок">↓</button>
                    <button type="button" onClick={() => duplicateBlock(block.id)} aria-label="Дублировать блок">+</button>
                    <button type="button" onClick={() => removeBlock(block.id)} aria-label="Удалить блок">×</button>
                  </div>
                </div>
              )) : <div className="editor-v2-empty">Слоёв пока нет.</div>}
            </div>
          </details>
          {selectedBlock ? (
            <div className="editor-v2-block-actions" aria-label="Действия с выбранным блоком">
              <button type="button" onClick={() => moveSelectedBlock(-1)} disabled={selectedIndex <= 0}>Выше</button>
              <button type="button" onClick={() => moveSelectedBlock(1)} disabled={selectedIndex < 0 || selectedIndex >= draftBlocks.length - 1}>Ниже</button>
              <button type="button" onClick={duplicateSelectedBlock}>Дубль</button>
              <button type="button" onClick={removeSelectedBlock}>Удалить</button>
            </div>
          ) : null}
          {shareUrl ? (
            <a className="editor-v2-open-link" href={shareUrl} target="_blank" rel="noreferrer">
              Открыть share
            </a>
          ) : (
            <span className="editor-v2-muted">Preview строится из JSON как HTML-документ</span>
          )}
        </div>

        <div className="editor-v2-stage">
          <div className={`editor-v2-frame-wrap ${previewMode}`}>
            {getEditableBlocks(draftBlocks).length ? (
              <iframe
                ref={iframeRef}
                key={previewMode}
                title="Предпросмотр концепта"
                className="editor-v2-frame"
                srcDoc={previewHtml}
                style={{ height: iframeHeight }}
                onLoad={() => {
                  if (heroBlock) patchHeroFrame(heroBlock.payload);
                  patchPaletteFrame();
                  restorePreviewScroll();
                }}
              />
            ) : (
              <div className="editor-v2-canvas-empty">
                <div className="editor-v2-empty-state">
                  <div className="editor-v2-empty-icon" aria-hidden>⊞</div>
                  <h2>Начните с Hero-блока</h2>
                  <p>Первый экран задаёт тон всему концепту — заголовок, фоновое фото и ключевая формулировка предложения.</p>
                  <button type="button" className="editor-v2-primary editor-v2-empty-cta" onClick={ensureHero}>
                    Создать Hero
                  </button>
                  <div className="editor-v2-empty-quick">
                    <span>Или сразу:</span>
                    <button type="button" onClick={() => addBlock("metrics")}>Факты</button>
                    <button type="button" onClick={() => addBlock("editorial")}>Текст + фото</button>
                    <button type="button" onClick={() => addBlock("gallery-showcase")}>Фото 100%</button>
                    <button type="button" onClick={() => addBlock("cta")}>Контакты</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="editor-v2-right">
        <div className="editor-v2-panel">
          <div className="editor-v2-panel-head editor-v2-panel-head-state">
            <span>{selectedBlock ? getBlockLabel(selectedBlock) : "Блок"}</span>
            <span className={`editor-v2-save-state ${saveState}`}>
              {saveState === "saving" && "Сохраняю"}
              {saveState === "saved" && (lastSavedAt ? `Сохранено ${lastSavedAt}` : "Сохранено")}
              {saveState === "error" && "Ошибка"}
              {saveState === "idle" && "Live"}
            </span>
          </div>

          {selectedBlock?.type === "hero" && heroBlock ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea
                  rows={3}
                  value={heroBlock.payload.headline || ""}
                  onChange={(event) => updateHeroPayload("headline", event.target.value)}
                />
              </label>
              <label className="editor-v2-field">
                <span>Подзаголовок</span>
                <textarea
                  rows={4}
                  value={heroBlock.payload.body || ""}
                  onChange={(event) => updateHeroPayload("body", event.target.value)}
                />
              </label>
              <ImageField
                label="Фон"
                value={heroBlock.payload.backgroundImageUrl || ""}
                onChange={(value) => updateHeroPayload("backgroundImageUrl", value, true)}
                onOpenMediaLibrary={() => setMediaModalTarget("backgroundImageUrl")}
              />
              {(heroBlock.payload.heroVariant || "image-split") === "image-split" ? (
                <label className="editor-v2-field">
                  <span>Затемнение: {typeof heroBlock.payload.overlayOpacity === "number" ? heroBlock.payload.overlayOpacity : 72}%</span>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    value={typeof heroBlock.payload.overlayOpacity === "number" ? heroBlock.payload.overlayOpacity : 72}
                    onChange={(event) => updateHeroPayload("overlayOpacity", Number(event.target.value))}
                  />
                </label>
              ) : (
                <div className="editor-v2-field-pair">
                  <label className="editor-v2-field">
                    <span>Цвет фона</span>
                    <input
                      type="color"
                      value={heroBlock.payload.backgroundColor || "#0d1116"}
                      onChange={(event) => updateHeroPayload("backgroundColor", event.target.value)}
                    />
                  </label>
                  <label className="editor-v2-field">
                    <span>Цвет текста</span>
                    <input
                      type="color"
                      value={heroBlock.payload.textColor || "#f6f2ea"}
                      onChange={(event) => updateHeroPayload("textColor", event.target.value)}
                    />
                  </label>
                </div>
              )}
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Заголовок desktop</span>
                  <input
                    type="number"
                    min={32}
                    max={120}
                    value={typeof heroBlock.payload.headlineDesktopSize === "number" ? heroBlock.payload.headlineDesktopSize : 56}
                    onChange={(event) => updateHeroPayload("headlineDesktopSize", Number(event.target.value))}
                  />
                </label>
                <label className="editor-v2-field">
                  <span>Заголовок mobile</span>
                  <input
                    type="number"
                    min={26}
                    max={72}
                    value={typeof heroBlock.payload.headlineMobileSize === "number" ? heroBlock.payload.headlineMobileSize : 34}
                    onChange={(event) => updateHeroPayload("headlineMobileSize", Number(event.target.value))}
                  />
                </label>
              </div>
              <ImageField
                label="Фото справа"
                value={heroBlock.payload.photoUrl || ""}
                onChange={(value) => updateHeroPayload("photoUrl", value, true)}
                onOpenMediaLibrary={() => setMediaModalTarget("photoUrl")}
              />
              <button type="button" className="editor-v2-danger" onClick={resetToHero}>
                Оставить только Hero
              </button>
            </div>
          ) : selectedBlock?.type === "metrics" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Подзаголовок</span>
                <textarea rows={3} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Цвет фона</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#f3efe7"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Цвет текста</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#15191f"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              {(selectedBlock.payload.metrics ?? []).slice(0, 3).map((metric, index) => (
                <div className="editor-v2-field-pair" key={index}>
                  <label className="editor-v2-field">
                    <span>Цифра {index + 1}</span>
                    <input value={metric.value} onChange={(event) => updateSelectedMetric(index, "value", event.target.value)} />
                  </label>
                  <label className="editor-v2-field">
                    <span>Подпись {index + 1}</span>
                    <input value={metric.label} onChange={(event) => updateSelectedMetric(index, "label", event.target.value)} />
                  </label>
                </div>
              ))}
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "editorial" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Текст</span>
                <textarea rows={5} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Цвет фона</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#ffffff"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Цвет текста</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#171d24"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              <ImageField
                label="Фото"
                value={selectedBlock.payload.photoUrl || ""}
                onChange={(value) => updateBlockPayload(selectedBlock.id, { photoUrl: value })}
                onOpenMediaLibrary={() => setMediaModalTarget("photoUrl")}
              />
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "gallery-showcase" ? (
            <div className="editor-v2-props">
              <ImageField
                label="Фото 100%"
                value={selectedBlock.payload.photoUrl || ""}
                onChange={(value) => updateBlockPayload(selectedBlock.id, { photoUrl: value })}
                onOpenMediaLibrary={() => setMediaModalTarget("photoUrl")}
              />
              <label className="editor-v2-field">
                <span>Подпись под фото</span>
                <textarea rows={3} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Текст desktop (px)</span>
                  <input type="number" min={12} max={40} value={typeof selectedBlock.payload.captionDesktopSize === "number" ? selectedBlock.payload.captionDesktopSize : 16} onChange={(event) => updateBlockPayload(selectedBlock.id, { captionDesktopSize: Number(event.target.value) })} />
                </label>
                <label className="editor-v2-field">
                  <span>Текст mobile (px)</span>
                  <input type="number" min={12} max={32} value={typeof selectedBlock.payload.captionMobileSize === "number" ? selectedBlock.payload.captionMobileSize : 14} onChange={(event) => updateBlockPayload(selectedBlock.id, { captionMobileSize: Number(event.target.value) })} />
                </label>
              </div>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Цвет плашки</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#0d1116"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Цвет текста</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#171d24"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "video-block" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Подпись</span>
                <textarea rows={3} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Ссылка на видео</span>
                <input value={selectedBlock.payload.videoUrl || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { videoUrl: event.target.value })} />
              </label>
              <ImageField
                label="Постер видео"
                value={selectedBlock.payload.videoPoster || ""}
                onChange={(value) => updateBlockPayload(selectedBlock.id, { videoPoster: value })}
                onOpenMediaLibrary={() => setMediaModalTarget("videoPoster")}
              />
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "gallery-photo" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Подпись</span>
                <textarea rows={3} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              {Array.from({ length: 6 }).map((_, index) => {
                const photo = selectedBlock.payload.photos?.[index];
                return (
                  <ImageField
                    key={index}
                    label={`Фото ${index + 1}`}
                    value={photo?.url || ""}
                    onChange={(value) => updateSelectedGalleryPhoto(index, { url: value })}
                    onOpenMediaLibrary={() => setMediaModalTarget(`gallery:${index}`)}
                  />
                );
              })}
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "custom-html" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>HTML-код</span>
                <textarea rows={16} value={selectedBlock.payload.customHtml || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { customHtml: event.target.value })} />
              </label>
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "cta" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Текст</span>
                <textarea rows={4} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Цвет фона</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#0d1116"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Цвет текста</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#171d24"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              <ImageField
                label="Ваше фото"
                value={selectedBlock.payload.photoUrl || ""}
                onChange={(value) => updateBlockPayload(selectedBlock.id, { photoUrl: value })}
                onOpenMediaLibrary={() => setMediaModalTarget("photoUrl")}
              />
              {(selectedBlock.payload.contacts ?? []).slice(0, 3).map((contact, index) => (
                <div className="editor-v2-contact-fields" key={index}>
                  <label className="editor-v2-field">
                    <span>Поле {index + 1}</span>
                    <input value={contact.label} onChange={(event) => updateSelectedContact(index, "label", event.target.value)} />
                  </label>
                  <label className="editor-v2-field">
                    <span>Значение {index + 1}</span>
                    <input value={contact.value} onChange={(event) => updateSelectedContact(index, "value", event.target.value)} />
                  </label>
                  <label className="editor-v2-field">
                    <span>Ссылка {index + 1}</span>
                    <input value={contact.href || ""} onChange={(event) => updateSelectedContact(index, "href", event.target.value)} placeholder="https://..." />
                  </label>
                </div>
              ))}
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Кнопка Telegram</span>
                  <input value={selectedBlock.payload.ctaHref || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { ctaHref: event.target.value, ctaLabel: selectedBlock.payload.ctaLabel || "Написать в Telegram" })} />
                </label>
                <label className="editor-v2-field">
                  <span>Кнопка MAX</span>
                  <input value={selectedBlock.payload.ctaHrefSecondary || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { ctaHrefSecondary: event.target.value, ctaLabelSecondary: selectedBlock.payload.ctaLabelSecondary || "Написать в MAX" })} />
                </label>
              </div>
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "rich-text" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Надзаголовок (необязательно)</span>
                <input value={selectedBlock.payload.eyebrow || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { eyebrow: event.target.value })} placeholder="Например: О компании" />
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Фон</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#ffffff"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Текст</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#171d24"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              <div className="editor-v2-field">
                <div className="editor-v2-field-header">
                  <span>Текст блока</span>
                  <button
                    type="button"
                    className="editor-v2-expand-btn"
                    onClick={() => setRichTextModalOpen(true)}
                    title="Открыть в полный экран"
                  >
                    ⛶ Развернуть
                  </button>
                </div>
                {!richTextModalOpen && (
                  <TiptapEditor
                    key={selectedBlock.id}
                    value={selectedBlock.payload.richTextHtml || ""}
                    onChange={(html) => updateBlockPayload(selectedBlock.id, { richTextHtml: html })}
                    placeholder="Введите текст. Можно вставить фото, видео YouTube, код..."
                    onUpload={uploadImageFile}
                  className={"tiptap-light"}
                  />
                )}
              </div>
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : selectedBlock?.type === "section-heading" ? (
            <div className="editor-v2-props">
              <label className="editor-v2-field">
                <span>Кикер (над заголовком)</span>
                <input value={selectedBlock.payload.eyebrow || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { eyebrow: event.target.value })} placeholder="Например: 03 / Производство" />
              </label>
              <label className="editor-v2-field">
                <span>Заголовок</span>
                <textarea rows={3} value={selectedBlock.payload.headline || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { headline: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Подзаголовок</span>
                <textarea rows={3} value={selectedBlock.payload.body || ""} onChange={(event) => updateBlockPayload(selectedBlock.id, { body: event.target.value })} />
              </label>
              <label className="editor-v2-field">
                <span>Выравнивание</span>
                <select value={selectedBlock.payload.headingAlign || "left"} onChange={(event) => updateBlockPayload(selectedBlock.id, { headingAlign: event.target.value as "left" | "center" | "right" })}>
                  <option value="left">По левому краю</option>
                  <option value="center">По центру</option>
                  <option value="right">По правому краю</option>
                </select>
              </label>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Заголовок desktop (px)</span>
                  <input type="number" min={32} max={160} value={typeof selectedBlock.payload.headlineDesktopSize === "number" ? selectedBlock.payload.headlineDesktopSize : 80} onChange={(event) => updateBlockPayload(selectedBlock.id, { headlineDesktopSize: Number(event.target.value) })} />
                </label>
                <label className="editor-v2-field">
                  <span>Заголовок mobile (px)</span>
                  <input type="number" min={22} max={80} value={typeof selectedBlock.payload.headlineMobileSize === "number" ? selectedBlock.payload.headlineMobileSize : 44} onChange={(event) => updateBlockPayload(selectedBlock.id, { headlineMobileSize: Number(event.target.value) })} />
                </label>
              </div>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Подзаголовок desktop (px)</span>
                  <input type="number" min={14} max={40} value={typeof selectedBlock.payload.subheadlineDesktopSize === "number" ? selectedBlock.payload.subheadlineDesktopSize : 20} onChange={(event) => updateBlockPayload(selectedBlock.id, { subheadlineDesktopSize: Number(event.target.value) })} />
                </label>
                <label className="editor-v2-field">
                  <span>Подзаголовок mobile (px)</span>
                  <input type="number" min={13} max={28} value={typeof selectedBlock.payload.subheadlineMobileSize === "number" ? selectedBlock.payload.subheadlineMobileSize : 17} onChange={(event) => updateBlockPayload(selectedBlock.id, { subheadlineMobileSize: Number(event.target.value) })} />
                </label>
              </div>
              <div className="editor-v2-field-pair">
                <label className="editor-v2-field">
                  <span>Цвет фона</span>
                  <input type="color" value={selectedBlock.payload.backgroundColor || "#ffffff"} onChange={(event) => updateBlockPayload(selectedBlock.id, { backgroundColor: event.target.value })} />
                </label>
                <label className="editor-v2-field">
                  <span>Цвет текста</span>
                  <input type="color" value={selectedBlock.payload.textColor || "#171d24"} onChange={(event) => updateBlockPayload(selectedBlock.id, { textColor: event.target.value })} />
                </label>
              </div>
              <button type="button" className="editor-v2-danger" onClick={removeSelectedBlock}>Удалить блок</button>
            </div>
          ) : (
            <button type="button" className="editor-v2-primary" onClick={ensureHero}>
              Создать первый Hero
            </button>
          )}
        </div>
      </aside>

      {richTextModalOpen && selectedBlock?.type === "rich-text" && typeof document !== "undefined" && createPortal(
        <div
          className="rich-text-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setRichTextModalOpen(false); }}
        >
          <div className="rich-text-modal">
            <div className="rich-text-modal-header">
              <div className="rich-text-modal-title">
                <span className="rich-text-modal-kicker">Текстовый блок</span>
                {selectedBlock.payload.eyebrow && <span className="rich-text-modal-eyebrow">{selectedBlock.payload.eyebrow}</span>}
              </div>
              <button type="button" className="rich-text-modal-close" onClick={() => setRichTextModalOpen(false)}>
                Закрыть ✕
              </button>
            </div>
            <div className="rich-text-modal-body">
              <TiptapEditor
                key={selectedBlock.id}
                value={selectedBlock.payload.richTextHtml || ""}
                onChange={(html) => updateBlockPayload(selectedBlock.id, { richTextHtml: html })}
                placeholder="Введите текст. Можно вставить фото, видео YouTube, чеклист..."
                onUpload={uploadImageFile}
                className={"tiptap-modal-size tiptap-light"}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {mediaModalTarget ? (
        <MediaLibraryModal
          target={mediaModalTarget}
          items={mediaItems}
          loading={mediaLoading}
          uploading={modalUploading}
          onClose={() => setMediaModalTarget(null)}
          onSelect={(item) => applyMediaToTarget(mediaModalTarget, item.url)}
          onUpload={uploadModalImage}
        />
      ) : null}
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  onOpenMediaLibrary,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onOpenMediaLibrary: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div className="editor-v2-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/sales-doc/uploads/..." />
      <button type="button" className="editor-v2-upload" onClick={onOpenMediaLibrary}>Выбрать из медиатеки</button>
      <label className="editor-v2-upload">
        <span>{uploading ? "Загрузка..." : "Загрузить изображение"}</span>
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setUploading(true);
            try {
              onChange(await uploadImageFile(file));
            } finally {
              setUploading(false);
              event.target.value = "";
            }
          }}
        />
      </label>
    </div>
  );
}

function MediaLibraryModal({
  target,
  items,
  loading,
  uploading,
  onClose,
  onSelect,
  onUpload,
}: {
  target: MediaModalTarget;
  items: MediaItem[];
  loading: boolean;
  uploading: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  onUpload: (file: File) => void;
}) {
  const images = items.filter((item) => item.kind === "image");

  return (
    <div className="editor-v2-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="editor-v2-media-modal" role="dialog" aria-modal="true" aria-label="Медиатека" onMouseDown={(event) => event.stopPropagation()}>
        <div className="editor-v2-modal-head">
          <div>
            <strong>Медиатека</strong>
            <span>{target === "backgroundImageUrl" ? "Выбор фона" : target === "videoPoster" ? "Выбор постера" : "Выбор фото"}</span>
          </div>
          <button type="button" onClick={onClose}>Закрыть</button>
        </div>
        <div className="editor-v2-modal-upload">
          <label className="editor-v2-upload">
            <span>{uploading ? "Загрузка..." : "Загрузить новый файл"}</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                onUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {loading ? (
          <div className="editor-v2-empty">Загружаю файлы...</div>
        ) : images.length ? (
          <div className="editor-v2-modal-grid">
            {images.map((item) => (
              <button key={item.id} type="button" className="editor-v2-modal-media" onClick={() => onSelect(item)} title={item.name}>
                <img src={item.url} alt="" loading="lazy" />
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="editor-v2-empty">В общей медиатеке пока нет изображений.</div>
        )}
      </div>
    </div>
  );
}
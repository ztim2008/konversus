"use client";

import { useState } from "react";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { parsePortfolioVideo } from "@/lib/portfolio-timeline/video";

import { VideoFrame } from "./video-frame";

export function MiniEditor({
  value,
  onChange,
  videoUrl,
  onVideoUrl,
}: {
  value: string;
  onChange: (html: string) => void;
  videoUrl: string;
  onVideoUrl: (url: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        protocols: ["http", "https"],
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: "Коротко: одно–три предложения" }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-24 px-3 py-3 text-sm leading-relaxed text-[var(--foreground)] outline-none",
        "aria-label": "Описание работы",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const [videoOpen, setVideoOpen] = useState(Boolean(videoUrl));
  const [videoDraft, setVideoDraft] = useState(videoUrl);
  const video = parsePortfolioVideo(videoDraft);

  function applyLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const entered = window.prompt("Ссылка", previous ?? "https://");
    if (entered === null) return;
    const url = entered.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: parsed.toString() }).run();
    } catch {
      return;
    }
  }

  function changeVideo(next: string) {
    const parsed = parsePortfolioVideo(next);
    if (parsed) {
      setVideoDraft(parsed.pageUrl);
      onVideoUrl(parsed.pageUrl);
      return;
    }
    setVideoDraft(next);
    onVideoUrl(next.trim());
  }

  function clearVideo() {
    setVideoDraft("");
    onVideoUrl("");
  }

  return (
    <div className="border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex gap-1 border-b border-[var(--line)] px-2 py-1.5">
        <button
          type="button"
          className="px-2 py-1 text-sm font-semibold text-[var(--foreground)]"
          aria-pressed={Boolean(editor?.isActive("bold"))}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Ж
        </button>
        <button
          type="button"
          className="px-2 py-1 text-sm italic text-[var(--foreground)]"
          aria-pressed={Boolean(editor?.isActive("italic"))}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          К
        </button>
        <button type="button" className="px-2 py-1 text-sm text-[var(--foreground)]" onClick={applyLink}>
          Ссылка
        </button>
        <button
          type="button"
          className="px-2 py-1 text-sm text-[var(--foreground)]"
          aria-pressed={videoOpen || Boolean(videoDraft.trim())}
          onClick={() => setVideoOpen(true)}
        >
          Видео
        </button>
      </div>
      <EditorContent editor={editor} />
      {videoOpen || videoDraft.trim() ? (
        <div className="border-t border-[var(--line)] px-3 py-3">
          <label className="block text-sm text-[var(--foreground)]">
            Ссылка на VK Видео или Rutube
            <input
              value={videoDraft}
              onChange={(event) => changeVideo(event.target.value)}
              placeholder="https://vk.com/video… или https://rutube.ru/video/…"
              className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] outline-none"
            />
          </label>
          {videoDraft.trim() && !video ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Нужна ссылка на vk.com, vkvideo.ru или rutube.ru</p>
          ) : null}
          {video ? (
            <div className="mt-3">
              <VideoFrame video={video} />
              <p className="mt-2 text-sm text-[var(--muted)]">
                На ленте плеер встанет на всю ширину. Фото можно не добавлять.{" "}
                <button type="button" className="underline decoration-[var(--line)] underline-offset-4" onClick={clearVideo}>
                  Убрать видео
                </button>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror p { margin: 0 0 0.6em; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
    </div>
  );
}

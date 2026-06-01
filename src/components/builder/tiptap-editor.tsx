"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// ── Стили редактора ──────────────────────────────────────────────────────────
const editorStyles = `
.tiptap-editor .ProseMirror {
  min-height: 240px;
  padding: 14px 16px;
  outline: none;
  font-size: 14px;
  line-height: 1.75;
  color: #e2e8f0;
  background: #0d1520;
  border: 1px solid rgba(255,255,255,0.1);
}
.tiptap-editor .ProseMirror:focus {
  border-color: rgba(246,196,123,0.35);
}
.tiptap-editor .ProseMirror p { margin: 0 0 0.75em; }
.tiptap-editor .ProseMirror p:last-child { margin-bottom: 0; }
.tiptap-editor .ProseMirror h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0; color: #fff; letter-spacing: -0.03em; }
.tiptap-editor .ProseMirror h2 { font-size: 1.3em; font-weight: 600; margin: 0.6em 0; color: #f1f5f9; }
.tiptap-editor .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; color: #cbd5e1; }
.tiptap-editor .ProseMirror strong { color: #fde68a; font-weight: 700; }
.tiptap-editor .ProseMirror em { color: #a5b4fc; font-style: italic; }
.tiptap-editor .ProseMirror u { text-decoration: underline; text-underline-offset: 3px; }
.tiptap-editor .ProseMirror a { color: #7db3ff; text-decoration: underline; }
.tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.5em; margin: 0.5em 0; }
.tiptap-editor .ProseMirror li { margin: 0.25em 0; }
.tiptap-editor .ProseMirror blockquote { border-left: 3px solid rgba(246,196,123,0.4); margin: 0.75em 0; padding: 0.5em 1em; color: #94a3b8; font-style: italic; }
.tiptap-editor .ProseMirror pre { background: #0d1117; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 12px 16px; overflow-x: auto; font-family: monospace; font-size: 13px; color: #a5f3fc; margin: 0.75em 0; }
.tiptap-editor .ProseMirror code { background: rgba(165,243,252,0.1); padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 0.88em; color: #a5f3fc; }
.tiptap-editor .ProseMirror img { max-width: 100%; border-radius: 2px; display: block; margin: 0.75em auto; }
.tiptap-editor .ProseMirror iframe { max-width: 100%; display: block; margin: 0.75em auto; border-radius: 2px; }
.tiptap-editor .ProseMirror hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 1em 0; }
.tiptap-editor .ProseMirror .is-editor-empty:first-child::before { content: attr(data-placeholder); color: rgba(148,163,184,0.4); float: left; pointer-events: none; height: 0; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0.25em; margin: 0.5em 0 1em; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.55em; margin: 0.35em 0; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] li label { flex-shrink: 0; cursor: pointer; padding-top: 2px; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] { width: 14px; height: 14px; accent-color: #f6c47b; cursor: pointer; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }
.tiptap-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div p { text-decoration: line-through; opacity: 0.45; }
.tiptap-editor .ProseMirror mark { background: rgba(246,196,123,0.28); color: inherit; border-radius: 2px; padding: 1px 3px; }
.tiptap-editor.tiptap-light .ProseMirror {
  background: #f8f6f2;
  color: #1a1d24;
  border-color: rgba(0,0,0,0.12);
}
.tiptap-editor.tiptap-light .ProseMirror:focus {
  border-color: rgba(155,108,68,0.45);
}
.tiptap-editor.tiptap-light .ProseMirror h1 { color: #0f1219; }
.tiptap-editor.tiptap-light .ProseMirror h2 { color: #1a1d24; }
.tiptap-editor.tiptap-light .ProseMirror h3 { color: #2a2d38; }
.tiptap-editor.tiptap-light .ProseMirror strong { color: #0f1219; }
.tiptap-editor.tiptap-light .ProseMirror em { color: #3a3d4a; }
.tiptap-editor.tiptap-light .ProseMirror a { color: #7a4e2a; }
.tiptap-editor.tiptap-light .ProseMirror blockquote { color: #555a66; border-left-color: rgba(155,108,68,0.5); }
.tiptap-editor.tiptap-light .ProseMirror hr { border-top-color: rgba(0,0,0,0.14); }
.tiptap-editor.tiptap-light .ProseMirror .is-editor-empty:first-child::before { color: rgba(60,64,80,0.35); }
.tiptap-color-input { width: 28px; height: 26px; padding: 1px 2px; border: 1px solid rgba(255,255,255,0.1); background: transparent; cursor: pointer; border-radius: 3px; }
.tiptap-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.tiptap-color-input::-webkit-color-swatch { border: none; border-radius: 2px; }
.tiptap-toolbar { display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px; background: rgba(16,22,32,0.96); border: 1px solid rgba(255,255,255,0.08); border-bottom: none; position: sticky; top: 0; z-index: 20; backdrop-filter: blur(8px); }
.tiptap-btn { padding: 4px 8px; border: 1px solid transparent; font-size: 12px; cursor: pointer; color: #94a3b8; background: transparent; border-radius: 3px; transition: all 0.12s; line-height: 1.4; font-family: inherit; }
.tiptap-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.tiptap-btn.active { background: rgba(246,196,123,0.12); border-color: rgba(246,196,123,0.25); color: #f6c47b; }
.tiptap-btn-icon { min-width: 28px; text-align: center; }
.tiptap-sep { width: 1px; background: rgba(255,255,255,0.1); margin: 3px 3px; align-self: stretch; }
`;

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
};

function Btn({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`tiptap-btn tiptap-btn-icon${active ? " active" : ""}`}
      title={title}
    >
      {children}
    </button>
  );
}

type TiptapEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  onUpload?: (file: File) => Promise<string>;
  className?: string;
};

export function TiptapEditor({ value, onChange, placeholder = "Начните вводить текст...", onUpload, className }: TiptapEditorProps) {
  const styleInjected = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const tag = document.createElement("style");
    tag.textContent = editorStyles;
    document.head.appendChild(tag);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        // В Tiptap 3.x StarterKit уже включает Link и Underline —
        // отключаем, чтобы не было дублей (мы добавляем их ниже с кастомными настройками)
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
      Youtube.configure({ width: 640, height: 360 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
    ],
    content: value ?? "",
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: { class: "ProseMirror" },
    },
  });

  const addImage = useCallback(() => {
    if (onUpload && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const url = prompt("URL изображения:");
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor, onUpload]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor || !onUpload) return;
    event.target.value = "";
    setUploading(true);
    try {
      const url = await onUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploading(false);
    }
  }, [editor, onUpload]);

  const addYoutube = useCallback(() => {
    const url = prompt("Ссылка YouTube / Vimeo:");
    if (url && editor) editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) { editor.chain().focus().unsetLink().run(); return; }
    const url = prompt("URL ссылки:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`tiptap-editor${className ? ` ${className}` : ""}`}>
      {/* Тулбар */}
      <div className="tiptap-toolbar">
        {/* Заголовки */}
        <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Обычный текст">¶</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Заголовок 1">H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Заголовок 2">H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок 3">H3</Btn>
        <div className="tiptap-sep" />
        {/* Форматирование */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный"><b>B</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив"><i>I</i></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Подчёркнутый"><u>U</u></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Зачёркнутый"><s>S</s></Btn>
        <div className="tiptap-sep" />
        {/* Списки */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Список">•—</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный">1.</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Цитата">"</Btn>
        <div className="tiptap-sep" />
        {/* Выравнивание */}
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="По левому краю">⇤</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="По центру">⇔</Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="По правому краю">⇥</Btn>
        <div className="tiptap-sep" />
        {/* Код */}
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Инлайн-код">{"`"}</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Блок кода">{"{}"}</Btn>
        <div className="tiptap-sep" />
        {/* Медиа */}
        <Btn onClick={addImage} title={onUpload ? "Загрузить фото с компьютера" : "Вставить изображение по URL"} active={uploading}>{uploading ? "⏳" : "🖼"}</Btn>
        <Btn onClick={addYoutube} title="Вставить YouTube/Vimeo">▶</Btn>
        <Btn onClick={setLink} active={editor.isActive("link")} title="Ссылка">🔗</Btn>
        <div className="tiptap-sep" />
        {/* Цвет, маркер, чеклист */}
        <input
          type="color"
          className="tiptap-color-input"
          value={editor.getAttributes("textStyle").color || "#f7f2ea"}
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          title="Цвет текста"
        />
        <Btn onClick={() => editor.chain().focus().unsetColor().run()} title="Сбросить цвет текста">✕A</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Маркер-подсветка">▐</Btn>
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Чеклист">☑</Btn>
        <div className="tiptap-sep" />
        {/* Разное */}
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Разделитель">—</Btn>
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Отменить">↩</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Повторить">↪</Btn>
      </div>

      {/* Поле редактора */}
      <EditorContent editor={editor} />
      {onUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}

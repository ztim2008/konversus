# Правила для Factory Proposal Builder

- Вся документация, тексты интерфейса, продуктовые решения и комментарии ведутся на русском языке.
- Избегать англоязычия в продуктовой терминологии, если нет технической необходимости.
- Проект строится как premium digital workspace, а не как типовая админка.
- Для MVP backend foundation: Supabase.
- Directus не использовать как базовый слой MVP. Рассматривать только как будущий backoffice или content layer.

## Добавление нового блока в редактор

Перед добавлением нового блока **обязательно** прочитать `docs/BLOCK-AUTHORING-GUIDE.md`.

Краткий порядок (все шаги расписаны в guide):
1. `src/types/domain.ts` — добавить тип в `ProposalBlockType`, новые поля в `ProposalBlockPayload`
2. `src/lib/proposal-builder.ts` — метаданные в `proposalBlockSemanticMetadata`, шаблон в `proposalBlockTemplates`, дефолты в `normalizeProposalBlocks`
3. `src/app/dashboard/proposals/[proposalId]/actions.ts` — парсинг новых полей из FormData
4. `src/components/builder/active-block-editor.tsx` — `*Fields` компонент, `isFullyCustom`, JSX-рендер
5. `src/components/builder/editor-canvas-v2.tsx` — тип в `InsertableBlockType`, кнопка в каталоге, секция в правой панели (**именно v2, не v1**)
6. `src/lib/proposal-html-renderer.ts` — HTML-рендер блока + inline CSS (canvas = отдельный iframe, globals.css туда не попадает)
7. `src/components/share/block-renderers.tsx` — компонент рендера, `case` в `renderBlock`
8. `src/app/globals.css` — CSS внутри `.fpb-page {}`
9. `npm run build && pm2 restart konversus-fpb --update-env`
"use client";

import { useRef, useState, useTransition } from "react";

import { duplicateProposalAction } from "@/app/dashboard/actions";

type Company = { id: string; name: string };

type Props = {
  proposalId: string;
  proposalTitle: string;
  currentCompanyId: string;
  companies: Company[];
};

export function DuplicateProposalModal({ proposalId, proposalTitle, currentCompanyId, companies }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function handleOpen() {
    setOpen(true);
    // Дать React обновить DOM, затем открыть нативный <dialog>
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function handleClose() {
    dialogRef.current?.close();
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      await duplicateProposalAction(data);
      // После redirect реакт ничего не рендерит, но на случай ошибки:
      setOpen(false);
    });
  }

  const defaultTitle = `Копия: ${proposalTitle}`;

  // Сортируем: текущая компания первой, остальные по алфавиту
  const sorted = [
    ...companies.filter((c) => c.id === currentCompanyId),
    ...companies.filter((c) => c.id !== currentCompanyId).sort((a, b) => a.name.localeCompare(b.name, "ru")),
  ];

  return (
    <>
      <button className="db-action db-action--clone" type="button" onClick={handleOpen} title="Дублировать концепт">
        ⧉ Клон
      </button>

      {open && (
        <dialog
          ref={dialogRef}
          className="db-duplicate-dialog"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="proposalId" value={proposalId} />

            <h2 className="db-duplicate-dialog__title">Дублировать концепт</h2>
            <p className="db-duplicate-dialog__subtitle">
              Создаётся точная копия всех блоков. Статус — черновик.
            </p>

            <label className="db-duplicate-dialog__field">
              <span>Название копии</span>
              <input
                className="builder-field"
                name="newTitle"
                defaultValue={defaultTitle}
                required
                autoFocus
              />
            </label>

            <label className="db-duplicate-dialog__field">
              <span>Компания</span>
              <select className="builder-select" name="targetCompanyId" defaultValue={currentCompanyId}>
                {sorted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id === currentCompanyId ? `${c.name} (текущая)` : c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="db-duplicate-dialog__actions">
              <button
                className="db-action db-action--primary"
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Создаём..." : "Создать копию →"}
              </button>
              <button
                className="db-action"
                type="button"
                onClick={handleClose}
                disabled={isPending}
              >
                Отмена
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

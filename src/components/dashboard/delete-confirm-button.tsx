"use client";

import { useRef } from "react";

type DeleteConfirmButtonProps = {
  action: (formData: FormData) => Promise<void>;
  idName: string;
  idValue: string;
  returnTo?: string;
  label?: string;
  confirmMessage?: string;
  className?: string;
};

export function DeleteConfirmButton({
  action,
  idName,
  idValue,
  returnTo,
  label = "Удалить",
  confirmMessage = "Удалить безвозвратно?",
  className,
}: DeleteConfirmButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} style={{ display: "inline" }}>
      <input type="hidden" name={idName} value={idValue} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className={className ?? "builder-action-danger"}
        onClick={(e) => {
          if (!window.confirm(confirmMessage)) {
            e.preventDefault();
          }
        }}
      >
        {label}
      </button>
    </form>
  );
}

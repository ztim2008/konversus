"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EditorCanvasV3 } from "@/components/builder/editor-canvas-v3";
import { DeleteConfirmButton } from "@/components/dashboard/delete-confirm-button";
import { deleteCurrentProposalAction, publishShareLinkAction, updateProposalBlocksAction } from "@/app/dashboard/proposals/[proposalId]/actions";
import { Company, Proposal, ProposalBlock } from "@/types/domain";

type ProposalEditorData = {
  proposalId: string;
  proposal: Proposal | null;
  company: Company | null;
  blocks: ProposalBlock[];
  shareUrl: string | null;
  shareActive: boolean;
  isLoading: boolean;
  error: string | null;
};

export default function ProposalEditorPage() {
  const routeParams = useParams<{ proposalId: string }>();
  const proposalId = routeParams?.proposalId ?? "";

  const [data, setData] = useState<ProposalEditorData | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const latestBlocksRef = useRef<ProposalBlock[] | null>(null);

  useEffect(() => {
    if (!proposalId) return;
    (async () => {
      try {
        const response = await fetch(
          `/api/proposals/${proposalId}/editor-data`,
          { cache: "no-store" }
        );

        if (response.status === 401) {
          window.location.href = "/auth";
          return;
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить данные редактора");
        }

        const json = (await response.json()) as ProposalEditorData;
        setData({
          ...json,
          isLoading: false,
          error: null,
        });
        latestBlocksRef.current = json.blocks;
      } catch {
        setData((prev) =>
          prev ? {
            ...prev,
            isLoading: false,
            error: "Ошибка загрузки данных",
          } : {
            proposalId: "",
            proposal: null,
            company: null,
            blocks: [],
            shareUrl: null,
            shareActive: false,
            isLoading: false,
            error: "Ошибка загрузки данных",
          }
        );
      }
    })();
  }, [proposalId]);

  if (!data || data.isLoading) return <div>Загрузка...</div>;
  if (data.error) return <div>Ошибка: {data.error}</div>;

  if (!data.proposal || !data.company) {
    return <div>Ошибка: данные концепта временно недоступны.</div>;
  }

  const {
    proposal,
    company,
    blocks,
    shareUrl,
    shareActive,
  } = data;

  const handleBlocksChange = async (updatedBlocks: ProposalBlock[]) => {
    latestBlocksRef.current = updatedBlocks;
    setIsSaving(true);
    setSaveState("saving");
    try {
      const formData = new FormData();
      formData.append("proposalId", proposalId);
      formData.append("structure", JSON.stringify(updatedBlocks));
      await updateProposalBlocksAction(formData);
      setData((prev) => prev ? { ...prev, blocks: updatedBlocks } : null);
      setSaveState("saved");
      setLastSavedAt(new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    } catch (error) {
      console.error("Save failed:", error);
      setSaveState("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      const currentBlocks = latestBlocksRef.current ?? blocks;

      setSaveState("saving");

      const saveBlocksFormData = new FormData();
      saveBlocksFormData.append("proposalId", proposalId);
      saveBlocksFormData.append("structure", JSON.stringify(currentBlocks));
      await updateProposalBlocksAction(saveBlocksFormData);

      const formData = new FormData();
      formData.append("proposalId", proposalId);
      await publishShareLinkAction(formData);

      const response = await fetch(
        `/api/proposals/${proposalId}/editor-data`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Не удалось обновить данные после публикации");
      }

      const json = (await response.json()) as ProposalEditorData;
      setData({
        ...json,
        isLoading: false,
        error: null,
      });
      latestBlocksRef.current = json.blocks;
      setSaveState("saved");
      setLastSavedAt(new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }));
    } catch (error) {
      console.error("Publish failed:", error);
      setSaveState("error");
    }
  };

  return (
    <main className="builder-shell mx-auto flex w-full max-w-full flex-1 flex-col px-3 pb-8 pt-3">
      {/* TOP BAR */}
      <header className="editor-topbar">
        <div className="editor-topbar-left">
          <Link className="editor-brand" href="/dashboard">
            Factory Proposal Builder
          </Link>
          <span className="editor-topbar-sep">/</span>
          <div>
            <div className="editor-topbar-title">{proposal.title}</div>
            <div className="editor-topbar-subtitle">{company.name}</div>
          </div>
        </div>
        <div className="editor-topbar-right">
          <DeleteConfirmButton
            action={deleteCurrentProposalAction}
            idName="proposalId"
            idValue={proposal.id}
            label="Удалить концепт"
            confirmMessage={`Удалить концепт «${proposal.title}»? Действие нельзя отменить.`}
            className="editor-topbar-button editor-topbar-button-danger"
          />
          <button
            className="editor-topbar-button editor-topbar-button-primary"
            onClick={handlePublish}
            type="button"
          >
            {shareActive ? "Обновить share" : "Публиковать"}
          </button>
          {saveState === "saving" && <span className="editor-topbar-subtitle">Сохраняю...</span>}
          {saveState === "saved" && !isSaving && lastSavedAt && (
            <span className="editor-topbar-subtitle">Сохранено в {lastSavedAt}</span>
          )}
          {saveState === "error" && (
            <span className="editor-topbar-subtitle">Ошибка сохранения</span>
          )}
        </div>
      </header>

      {/* LIVE CANVAS */}
      <EditorCanvasV3
        blocks={blocks}
        shareUrl={shareUrl}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        onBlocksChange={handleBlocksChange}
        onDraftBlocksChange={(updatedBlocks) => {
          latestBlocksRef.current = updatedBlocks;
        }}
      />
    </main>
  );
}

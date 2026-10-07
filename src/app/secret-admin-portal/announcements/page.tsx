"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { getAdminAnnouncement, saveAdminAnnouncement, type AdminAnnouncement } from "@/lib/admin";
import { getApiErrorMessage } from "@/lib/api";

export default function AdminAnnouncementPage() {
  const ready = useRequireAdmin();
  const t = useTranslations("admin.announcement");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAdminAnnouncement();
        if (!mounted || !response.data) return;
        applyAnnouncement(response.data);
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(getApiErrorMessage(error, tCommon("unknownError")));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [ready, tCommon]);

  function applyAnnouncement(announcement: AdminAnnouncement) {
    setTitle(announcement.title);
    setBody(announcement.body);
    setIsActive(announcement.isActive);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      setErrorMessage(t("errors.titleRequired"));
      return;
    }
    if (!trimmedBody) {
      setErrorMessage(t("errors.bodyRequired"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await saveAdminAnnouncement({
        title: trimmedTitle,
        body: trimmedBody,
        isActive,
      });
      applyAnnouncement(response.data);
      setSuccessMessage(isActive ? t("published") : t("savedHidden"));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("errors.generic")));
    } finally {
      setIsSaving(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="page-shell">
      <AdminNav />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{t("eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-white/5" />
        ) : (
          <form onSubmit={handleSubmit} className="card-surface rounded-3xl p-5">
            <label className="block text-sm font-medium text-slate-200" htmlFor="announcement-title">
              {t("titleLabel")}
            </label>
            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="input-surface mt-1.5 py-3"
            />

            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="announcement-body">
              {t("bodyLabel")}
            </label>
            <textarea
              id="announcement-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              className="input-surface mt-1.5 min-h-[180px] py-3"
            />

            <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              {t("activeLabel")}
            </label>
            <p className="mt-2 text-xs text-slate-400">{t("hint")}</p>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 py-3 text-sm font-semibold text-[#041016] disabled:opacity-50"
            >
              {isSaving ? t("saving") : t("save")}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

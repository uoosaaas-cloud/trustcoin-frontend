"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import {
  getAdminUsers,
  sendAdminUserEmail,
  type AdminUserListItem,
} from "@/lib/admin";
import { getApiErrorMessage } from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 30;

function parseExternalEmails(value: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of value.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export default function AdminSendEmailPage() {
  const ready = useRequireAdmin();
  const t = useTranslations("admin.email");
  const tCommon = useTranslations("common");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [externalText, setExternalText] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => user.email.toLowerCase().includes(q));
  }, [users, search]);

  const externalEmails = useMemo(() => parseExternalEmails(externalText), [externalText]);
  const invalidExternal = externalEmails.filter((email) => !EMAIL_REGEX.test(email));
  const recipientCount = selectedIds.length + externalEmails.length;

  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAdminUsers();
        if (!mounted) return;
        setUsers(response.data);
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

  function toggleUser(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  function toggleVisible() {
    const visibleIds = visibleUsers.map((user) => user.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    if (selectedIds.length === 0 && externalEmails.length === 0) {
      setErrorMessage(t("errors.userRequired"));
      return;
    }
    if (invalidExternal.length > 0) {
      setErrorMessage(t("errors.invalidExternal"));
      return;
    }
    if (recipientCount > MAX_RECIPIENTS) {
      setErrorMessage(t("errors.tooMany"));
      return;
    }
    if (!trimmedSubject) {
      setErrorMessage(t("errors.subjectRequired"));
      return;
    }
    if (!trimmedBody) {
      setErrorMessage(t("errors.bodyRequired"));
      return;
    }

    setIsSending(true);
    try {
      const response = await sendAdminUserEmail({
        userIds: selectedIds,
        externalEmails,
        subject: trimmedSubject,
        body: trimmedBody,
      });
      const failed = response.data.failed ?? [];
      setSuccessMessage(
        t("successBatch", {
          sent: response.data.sent?.length ?? (response.data.to ? 1 : 0),
          failed: failed.length,
        })
      );
      if (failed.length > 0) {
        setErrorMessage(t("partialFailed", { emails: failed.map((item) => item.email).join(", ") }));
      }
      setSubject("");
      setBody("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("errors.generic")));
    } finally {
      setIsSending(false);
    }
  }

  if (!ready) return null;

  const visibleAllSelected =
    visibleUsers.length > 0 && visibleUsers.every((user) => selectedIds.includes(user.id));

  return (
    <div className="page-shell">
      <AdminNav />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{t("eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">{t("subtitle")}</p>
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

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="card-surface rounded-3xl p-5">
            <label className="block text-sm font-medium text-slate-200" htmlFor="admin-email-external">
              {t("externalLabel")}
            </label>
            <textarea
              id="admin-email-external"
              value={externalText}
              onChange={(event) => setExternalText(event.target.value)}
              placeholder={t("externalPlaceholder")}
              className="input-surface mt-1.5 min-h-[120px] py-3"
            />
            <p className="mt-2 text-xs text-slate-400">{t("externalHint")}</p>

            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="admin-email-subject">
              {t("subjectLabel")}
            </label>
            <input
              id="admin-email-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t("subjectPlaceholder")}
              className="input-surface mt-1.5 py-3"
              maxLength={200}
            />

            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="admin-email-body">
              {t("bodyLabel")}
            </label>
            <textarea
              id="admin-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("bodyPlaceholder")}
              className="input-surface mt-1.5 min-h-[220px] py-3"
              maxLength={20000}
            />

            <p className="mt-3 text-xs text-slate-400">{t("recipientCount", { count: recipientCount })}</p>

            <button
              type="submit"
              disabled={isSending || isLoading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 py-3 text-sm font-semibold text-[#041016] disabled:opacity-50"
            >
              {isSending ? t("sending") : t("submit")}
            </button>
          </section>

          <section className="card-surface rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{t("usersTitle")}</h2>
              <button
                type="button"
                onClick={toggleVisible}
                disabled={visibleUsers.length === 0}
                className="text-xs font-semibold text-cyan-200 disabled:opacity-40"
              >
                {visibleAllSelected ? t("clearVisible") : t("selectVisible")}
              </button>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input-surface mb-4 mt-3 py-2.5"
            />
            {isLoading ? (
              <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
            ) : visibleUsers.length === 0 ? (
              <p className="text-sm text-slate-400">{t("empty")}</p>
            ) : (
              <ul className="max-h-[480px] space-y-2 overflow-y-auto">
                {visibleUsers.map((user) => {
                  const checked = selectedIds.includes(user.id);
                  return (
                    <li key={user.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-2.5 hover:bg-white/[0.04]">
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(user.id)}
                          />
                          <span>
                            <span className="block text-sm font-medium text-white">{user.email}</span>
                            <span className="block text-xs text-slate-400">{user.status}</span>
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </form>
      </main>
    </div>
  );
}

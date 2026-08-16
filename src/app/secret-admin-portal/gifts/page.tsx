"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import {
  distributeAdminGifts,
  getAdminUsers,
  type AdminUserListItem,
} from "@/lib/admin";
import { getApiErrorMessage } from "@/lib/api";
import { formatUsdt } from "@/lib/format";

export default function AdminGiftsPage() {
  const ready = useRequireAdmin();
  const t = useTranslations("admin.gifts");
  const tCommon = useTranslations("common");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scope, setScope] = useState<"SELECTED" | "ALL_EXCEPT_ADMIN">("SELECTED");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const eligibleUsers = useMemo(
    () => users.filter((user) => user.role !== "ADMIN" && user.status === "ACTIVE"),
    [users]
  );

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter((user) => user.email.toLowerCase().includes(q));
  }, [eligibleUsers, search]);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAdminUsers(undefined, "ACTIVE");
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

  function selectVisible() {
    setSelectedIds(visibleUsers.map((user) => user.id));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const amountNum = Number(amount.trim());
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage(t("errors.amountRequired"));
      return;
    }

    if (scope === "SELECTED" && selectedIds.length === 0) {
      setErrorMessage(t("errors.usersRequired"));
      return;
    }

    const targetCount = scope === "ALL_EXCEPT_ADMIN" ? eligibleUsers.length : selectedIds.length;
    if (!window.confirm(t("confirm", { amount: formatUsdt(amount.trim()), count: targetCount }))) {
      return;
    }

    setIsSending(true);
    try {
      const response = await distributeAdminGifts({
        amount: amount.trim(),
        note: note.trim() || undefined,
        scope,
        userIds: scope === "SELECTED" ? selectedIds : undefined,
      });
      setSuccessMessage(
        t("success", {
          amount: formatUsdt(response.data.amount),
          credited: response.data.credited,
          targeted: response.data.targeted,
        })
      );
      setNote("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("errors.generic")));
    } finally {
      setIsSending(false);
    }
  }

  if (!ready) return null;

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

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="card-surface rounded-3xl p-5">
            <label className="block text-sm font-medium text-slate-200" htmlFor="gift-amount">
              {t("amountLabel")}
            </label>
            <input
              id="gift-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("amountPlaceholder")}
              className="input-surface mt-1.5 py-3"
            />

            <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="gift-note">
              {t("noteLabel")}
            </label>
            <input
              id="gift-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="input-surface mt-1.5 py-3"
            />

            <fieldset className="mt-5 space-y-2">
              <legend className="text-sm font-medium text-slate-200">{t("scopeLabel")}</legend>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="gift-scope"
                  checked={scope === "SELECTED"}
                  onChange={() => setScope("SELECTED")}
                />
                <span>{t("scopeSelected", { count: selectedIds.length })}</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="gift-scope"
                  checked={scope === "ALL_EXCEPT_ADMIN"}
                  onChange={() => setScope("ALL_EXCEPT_ADMIN")}
                />
                <span>{t("scopeAll", { count: eligibleUsers.length })}</span>
              </label>
            </fieldset>

            <button
              type="submit"
              disabled={isSending || isLoading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 py-3 text-sm font-semibold text-[#041016] disabled:opacity-50"
            >
              {isSending ? t("sending") : t("submit")}
            </button>
          </section>

          <section className="card-surface rounded-3xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{t("usersTitle")}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectVisible}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  {t("selectVisible")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  {t("clearSelection")}
                </button>
              </div>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input-surface mb-4 py-2.5"
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
                            <span className="block text-xs text-slate-400">
                              {t("available", { amount: formatUsdt(user.availableBalance) })}
                            </span>
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

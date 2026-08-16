"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuthChromeHeader } from "@/components/AuthChromeHeader";
import { TrustComplianceBlock } from "@/components/TrustCompliance";
import { getApiErrorMessage } from "@/lib/api";
import { resubmitIdDocument } from "@/lib/auth";

const SUPPORT_EMAIL = "support@trustcoin.cc";

export default function AccountPendingPage() {
  const t = useTranslations("accountPending");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleResubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!email.trim() || !password || !idDocument) {
      setErrorMessage(t("resubmitRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await resubmitIdDocument({
        email: email.trim(),
        password,
        idDocument,
      });
      setSuccessMessage(t("resubmitSuccess"));
      setPassword("");
      setIdDocument(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, tCommon("unknownError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell flex flex-col">
      <AuthChromeHeader brandHref="/" />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg">
          <div className="card-surface animate-fade-in-up rounded-[1.5rem] p-7 sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200 sm:text-xs">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-[2rem]">
              {t("title")}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{t("body")}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-400">{t("timeline")}</p>

            <form onSubmit={handleResubmit} className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{t("resubmitTitle")}</p>
              <p className="text-xs leading-relaxed text-slate-400">{t("resubmitHint")}</p>
              {errorMessage ? (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {successMessage}
                </p>
              ) : null}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("emailPlaceholder")}
                className="input-surface py-2.5"
                autoComplete="email"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("passwordPlaceholder")}
                className="input-surface py-2.5"
                autoComplete="current-password"
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setIdDocument(event.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-100"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? t("resubmitSending") : t("resubmitSubmit")}
              </button>
            </form>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-6 flex items-center justify-between rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <span>{t("supportLabel")}</span>
              <span dir="ltr" className="font-semibold">
                {SUPPORT_EMAIL}
              </span>
            </a>

            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-200 py-3 text-sm font-bold text-[#041016]"
            >
              {t("backToLogin")}
            </Link>
          </div>

          <div className="mt-8">
            <TrustComplianceBlock compact />
          </div>
        </div>
      </main>
    </div>
  );
}

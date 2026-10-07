"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthChromeHeader } from "@/components/AuthChromeHeader";

const SUPPORT_EMAIL = "support@trustcoin.cc";

export default function AccountDisabledPage() {
  const t = useTranslations("accountDisabled");

  return (
    <div className="page-shell flex flex-col">
      <AuthChromeHeader brandHref="/" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="card-surface w-full max-w-lg rounded-[1.5rem] p-7 sm:p-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300">{t("eyebrow")}</p>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-[2rem]">{t("title")}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">{t("body")}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#041016]"
          >
            {t("support")}
          </a>
          <p className="mt-4 text-sm text-slate-400">{SUPPORT_EMAIL}</p>
          <Link href="/login" className="mt-6 inline-block text-sm text-cyan-200 hover:text-cyan-100">
            {t("backToLogin")}
          </Link>
        </div>
      </main>
    </div>
  );
}

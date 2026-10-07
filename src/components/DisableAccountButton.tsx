"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { disableMyAccount } from "@/lib/account";
import { getApiErrorMessage } from "@/lib/api";
import { clearAuthSession, getStoredUser } from "@/lib/auth";

export function DisableAccountButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useTranslations("disableAccount");
  const tCommon = useTranslations("common");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setReady(getStoredUser()?.role !== "ADMIN");
  }, []);

  if (!ready) {
    return null;
  }

  async function confirmDisable() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await disableMyAccount();
      clearAuthSession();
      router.replace("/account-disabled");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, tCommon("unknownError")));
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {t("button")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card-surface w-full max-w-md rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white">{t("title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("body")}</p>
            {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setOpen(false);
                  setErrorMessage(null);
                }}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void confirmDisable()}
                className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? t("working") : t("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

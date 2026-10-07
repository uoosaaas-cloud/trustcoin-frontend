"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { dismissMyAnnouncement, getMyAnnouncement, type UserAnnouncement } from "@/lib/account";

export function DashboardAnnouncement() {
  const t = useTranslations("announcement");
  const [announcement, setAnnouncement] = useState<UserAnnouncement | null>(null);

  useEffect(() => {
    let mounted = true;
    void getMyAnnouncement()
      .then((response) => {
        if (mounted) setAnnouncement(response.data);
      })
      .catch(() => {
        if (mounted) setAnnouncement(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement) return null;

  function close() {
    const current = announcement;
    setAnnouncement(null);
    if (!current) return;
    void dismissMyAnnouncement(current.id).catch(() => undefined);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4">
      <section className="card-surface w-full max-w-lg rounded-3xl p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">{t("eyebrow")}</p>
        <h2 className="mt-2 text-xl font-bold text-white">{announcement.title}</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{announcement.body}</p>
        <button
          type="button"
          onClick={close}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 py-3 text-sm font-semibold text-[#041016]"
        >
          {t("close")}
        </button>
      </section>
    </div>
  );
}

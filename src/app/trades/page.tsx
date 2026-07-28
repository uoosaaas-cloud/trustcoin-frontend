"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { usePollingReload } from "@/hooks/usePollingReload";
import { getStoredAuthToken, getApiErrorMessage } from "@/lib/api";
import { formatUsdt } from "@/lib/format";
import { listUserTrades, type TradeItem } from "@/lib/trades";

export default function UserTradesPage() {
  const t = useTranslations("trades");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!getStoredAuthToken()) {
      router.replace("/login?next=/trades/");
      return;
    }
    setEnabled(true);
  }, [router]);

  const load = useCallback(async () => {
    if (!getStoredAuthToken()) return;
    try {
      const response = await listUserTrades();
      setTrades(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, tCommon("unknownError")));
    } finally {
      setIsLoading(false);
    }
  }, [tCommon]);

  usePollingReload(load, enabled, 15_000);

  function outcomeLabel(outcome: TradeItem["outcome"]) {
    if (outcome === "PROFITABLE") return t("outcome.profitable");
    if (outcome === "LOSS") return t("outcome.loss");
    return t("outcome.pending");
  }

  function sideLabel(side: TradeItem["side"]) {
    return side === "BUY" ? t("side.buy") : t("side.sell");
  }

  return (
    <div className="page-shell">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("subtitle")}</p>

        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="table-surface mt-8">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">{t("columns.symbol")}</th>
                <th className="px-4 py-3 font-semibold">{t("columns.side")}</th>
                <th className="px-4 py-3 font-semibold">{t("columns.amount")}</th>
                <th className="px-4 py-3 font-semibold">{t("columns.outcome")}</th>
                <th className="px-4 py-3 font-semibold">{t("columns.time")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    …
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold tracking-wide text-slate-900">
                      {trade.symbol}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-bold uppercase ${
                          trade.side === "SELL"
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {sideLabel(trade.side)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800" dir="ltr">
                      {formatUsdt(trade.amount)}$
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-sm font-semibold ${
                          trade.outcome === "PROFITABLE"
                            ? "text-emerald-600"
                            : trade.outcome === "LOSS"
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}
                      >
                        {outcomeLabel(trade.outcome)}
                      </span>
                      {trade.note ? (
                        <p className="mt-0.5 text-xs text-slate-400">{trade.note}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500" dir="ltr">
                      {new Date(trade.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

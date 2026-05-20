"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminLinkMarketOnchain,
  adminMarkOnchainResolved,
  adminSkipMarketOnchain,
} from "@/app/actions/admin";
import {
  ONCHAIN_RESOLVE_STATUS_LABELS,
  onchainResolveHint,
  type MarketOnchainLink,
  type OnchainResolveStatus,
} from "@/lib/onchain/uma";
import { getUmaCtfAdapterAddress } from "@/lib/onchain/addresses";
import { buildResolveBridgeState } from "@/lib/onchain/resolve-bridge";
import type { MarketOutcome } from "@/lib/types";

export function AdminOnchainPanel({
  marketId,
  slug,
  marketStatus,
  link,
  outcomes,
  resolvedOutcomeKey,
}: {
  marketId: string;
  slug: string;
  marketStatus: string;
  link: MarketOnchainLink;
  outcomes: MarketOutcome[];
  resolvedOutcomeKey?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [conditionId, setConditionId] = useState(link.onchain_condition_id ?? "");
  const [questionId, setQuestionId] = useState(link.onchain_question_id ?? "");
  const [initTx, setInitTx] = useState(link.onchain_init_tx_hash ?? "");
  const [resolveTx, setResolveTx] = useState(link.onchain_resolve_tx_hash ?? "");

  const adapterAddr = getUmaCtfAdapterAddress();
  const status = link.onchain_resolve_status;
  const bridge =
    marketStatus === "resolved"
      ? buildResolveBridgeState(link, resolvedOutcomeKey ?? null, outcomes)
      : null;

  function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setMessage(result.error);
      else {
        router.refresh();
        setMessage("Сохранено");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
      <header>
        <h3 className="text-sm font-medium text-violet-200">On-chain (UMA CTF Adapter)</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Testnet Amoy · v3.1.0 · off-chain резолв остаётся источником истины для виртуального USD.
        </p>
      </header>

      <dl className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <div>
          <dt className="text-zinc-600">Статус</dt>
          <dd className="text-zinc-200">
            {ONCHAIN_RESOLVE_STATUS_LABELS[status as OnchainResolveStatus] ?? status}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-600">Adapter (Amoy)</dt>
          <dd className="break-all font-mono text-zinc-300">
            {adapterAddr ?? "—"}
          </dd>
        </div>
        {link.onchain_condition_id && (
          <div className="sm:col-span-2">
            <dt className="text-zinc-600">conditionId</dt>
            <dd className="break-all font-mono text-zinc-300">{link.onchain_condition_id}</dd>
          </div>
        )}
        {link.onchain_question_id && (
          <div className="sm:col-span-2">
            <dt className="text-zinc-600">questionId</dt>
            <dd className="break-all font-mono text-zinc-300">{link.onchain_question_id}</dd>
          </div>
        )}
      </dl>

      <p className="text-xs text-zinc-500">{onchainResolveHint(status)}</p>

      {bridge && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-400">
          {bridge.hint}
        </p>
      )}

      {marketStatus !== "resolved" && status !== "skipped" && !link.onchain_condition_id && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">
            После{" "}
            <code className="text-zinc-400">npm run onchain:uma:init</code> вставьте
            conditionId и questionId из вывода скрипта.
          </p>
          <label className="block text-xs text-zinc-400">
            conditionId (0x…64)
            <input
              value={conditionId}
              onChange={(e) => setConditionId(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
              placeholder="0x…"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            questionId (0x…64)
            <input
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
              placeholder="0x…"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Tx initialize (необязательно)
            <input
              value={initTx}
              onChange={(e) => setInitTx(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
              placeholder="0x…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !conditionId || !questionId}
              onClick={() =>
                run(() =>
                  adminLinkMarketOnchain(marketId, {
                    conditionId,
                    questionId,
                    initTxHash: initTx || undefined,
                  }),
                )
              }
              className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              Привязать on-chain
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => adminSkipMarketOnchain(marketId))}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Без on-chain (MVP)
            </button>
          </div>
        </div>
      )}

      {(status === "pending_uma" || status === "ready_onchain") && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">
            После вызова <code className="text-zinc-400">resolve()</code> на adapter отметьте
            on-chain резолв:
          </p>
          <label className="block text-xs text-zinc-400">
            Tx resolve (необязательно)
            <input
              value={resolveTx}
              onChange={(e) => setResolveTx(e.target.value.trim())}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                adminMarkOnchainResolved(marketId, {
                  resolveTxHash: resolveTx || undefined,
                }),
              )
            }
            className="rounded-lg border border-emerald-600/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            On-chain резолв выполнен
          </button>
        </div>
      )}

      {message && <p className="text-xs text-rose-400">{message}</p>}
      <p className="text-xs text-zinc-600">
        Подробнее: docs/onchain/E6.md · автоматический operator-сервис — backlog после E6.
      </p>
    </section>
  );
}

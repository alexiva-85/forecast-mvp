import { describe, it, expect } from "vitest";
import { describeActivity } from "@/lib/activity";
import type { ActivityRow } from "@/lib/activity";
import { describeOpenOrder, formatShareCount } from "@/lib/portfolio-ui";

function row(partial: Partial<ActivityRow> & Pick<ActivityRow, "event_type">): ActivityRow {
  return {
    event_id: "1",
    event_at: "2026-05-18T12:00:00Z",
    market_slug: "multi-mkt",
    market_title: "Test market",
    side: null,
    direction: null,
    price: null,
    size: null,
    amount: null,
    fee: null,
    ...partial,
  };
}

describe("describeActivity — multi-outcome labels", () => {
  const labelsBySlug = {
    "multi-mkt": { o1: "Кандидат A", o2: "Кандидат B", yes: "Да", no: "Нет" },
  };

  it("builds trade detail with market, outcome and price", () => {
    const view = describeActivity(
      row({
        event_type: "trade_buy",
        side: "yes",
        price: 0.55,
        size: 10,
        market_title: "Bitcoin",
        market_slug: "btc",
      }),
    );
    expect(view.badgeLabel).toBe("Покупка");
    expect(view.badgeVariant).toBe("buy");
    expect(view.detailLine).toBe("Bitcoin · Да · 10 долей по 55¢");
  });

  it("uses outcome label from map for multi keys", () => {
    const view = describeActivity(
      row({
        event_type: "trade_sell",
        side: "o1",
        price: 0.4,
        size: 5,
        market_slug: "multi-mkt",
        market_title: "Выборы",
      }),
      labelsBySlug,
    );
    expect(view.badgeLabel).toBe("Продажа");
    expect(view.detailLine).toBe("Выборы · Кандидат A · 5 долей по 40¢");
  });

  it("formats cancelled order detail", () => {
    const view = describeActivity(
      row({
        event_type: "order_cancelled",
        side: "o3",
        direction: "sell",
        price: 0.6,
        size: 2,
        market_slug: "multi-mkt",
        market_title: "Турнир",
      }),
      labelsBySlug,
    );
    expect(view.badgeLabel).toBe("Отмена");
    expect(view.badgeVariant).toBe("cancel");
    expect(view.detailLine).toBe("Турнир · o3 · 2 доли по 60¢");
  });
});

describe("portfolio-ui helpers", () => {
  it("formatShareCount pluralizes in Russian", () => {
    expect(formatShareCount(1)).toBe("1 доля");
    expect(formatShareCount(2)).toBe("2 доли");
    expect(formatShareCount(5)).toBe("5 долей");
    expect(formatShareCount(11)).toBe("11 долей");
  });

  it("describeOpenOrder puts action first", () => {
    const { actionLine, termsLine } = describeOpenOrder(
      "sell",
      "o1",
      5,
      0.5,
      "Команда sandbox",
    );
    expect(actionLine).toBe("Продать: Команда sandbox");
    expect(termsLine).toBe("5 долей по 50¢");
  });
});

import { describe, it, expect } from "vitest";
import robots, { PRIVATE_PATHS, PUBLIC_PATHS } from "@/app/robots";

// De portier moet blijven weten wie er binnen mag. Voegt iemand later een route
// toe die lokale data toont, dan hoort die in PRIVATE_PATHS — deze test bewaakt
// dat de bestaande lijst intact blijft en de twee deuren niet omdraaien.

const rules = () => {
  const rule = robots().rules;
  return Array.isArray(rule) ? rule[0] : rule;
};

const asList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

describe("robots policy", () => {
  it("laat de voordeur open voor de publieke pagina's", () => {
    const allow = asList(rules().allow);
    for (const path of PUBLIC_PATHS) expect(allow).toContain(path);
  });

  it("houdt elke app-route met lokale data buiten de crawler", () => {
    const disallow = asList(rules().disallow);
    for (const path of PRIVATE_PATHS) expect(disallow).toContain(path);
  });

  it("laat geen route tegelijk toe én weigeren", () => {
    const allow = asList(rules().allow);
    const disallow = asList(rules().disallow);
    expect(allow.filter((p) => disallow.includes(p))).toEqual([]);
  });

  it("richt zich op alle crawlers", () => {
    expect(rules().userAgent).toBe("*");
  });
});

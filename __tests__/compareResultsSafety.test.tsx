import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CompareResults from "@/components/compare/CompareResults";
import { buildCompareModel } from "@/lib/compareV2";
import { CATEGORIES } from "@/lib/kinks";
import type { CompareResultFilter } from "@/lib/compare";
import type { Profile } from "@/types";

const a: Profile = {
  id: "a", name: "Alex volledig", role: "Dominant", experienceLevel: "beginner",
  createdAt: 1, updatedAt: 1,
  customKinks: [{ id: "public-limit", name: "Zichtbare eigen grens" }, { id: "secret", name: "Geheim onderwerp" }],
  entries: {
    "public-limit": { status: "hard_no", comment: "Niet delen" },
    secret: { status: "hard_no", privateResponse: true, comment: "Geheime notitie" },
    praise_kink: { status: "hard_no", comment: "" },
    wax_play: { status: "maybe", comment: "" },
  },
};
const b: Profile = { ...a, id: "b", name: "Sam volledig", customKinks: [], entries: {} };

function render(profileA: Profile | undefined = a, profileB: Profile | undefined = b, filter?: CompareResultFilter, samePairError = false) {
  const model = buildCompareModel(profileA, profileB);
  return renderToStaticMarkup(<CompareResults profileA={profileA} profileB={profileB}
    samePairError={samePairError} model={model}
    selectedResults={new Set(filter ? [filter] : [])}
    selectedCategories={new Set(filter ? [CATEGORIES[0]] : [])}
    discussed={new Set(model.unpaired.map((item) => item.id))} hideDiscussed={Boolean(filter)}
    onToggleDiscussed={() => {}} />);
}

describe("Compare visible unpaired safety", () => {
  it.each<CompareResultFilter>(["shared", "complementary", "discuss", "soft", "boundaries"])("keeps public limits visible outside disclosure with %s/category/discussed filters", (filter) => {
    const html = render(a, b, filter);
    const safety = html.match(/<section[^>]*aria-labelledby="compare-unpaired-limits-heading"[\s\S]*?<\/section>/)?.[0];
    expect(safety).toContain("Zichtbare eigen grens");
    expect(safety).toContain("Alex volledig");
    expect(safety).toContain("Sam volledig: geen zichtbaar antwoord.");
    expect(safety).toContain("Harde grens");
    expect(safety).not.toContain("<details");
    expect(html).not.toMatch(/Geheim onderwerp|Geheime notitie|Niet delen/);
    expect(buildCompareModel(a, b).summary.jointlyAssessed).toBe(0);
  });

  it("does not duplicate safety rows in the generic unpaired disclosure", () => {
    const html = render();
    const details = html.match(/<details[\s\S]*?<\/details>/)?.[0];
    expect(details).toContain("Nog niet door beiden beoordeeld · 1");
    expect(details).not.toContain("Zichtbare eigen grens");
    expect(details).not.toContain("Harde grens");
  });

  it("renders an absent answer identically to a concealed answer", () => {
    const concealed: Profile = { ...b, entries: { praise_kink: { status: "yes", privateResponse: true, comment: "Hidden answer" } } };
    expect(render(a, concealed)).toBe(render(a, b));
  });

  it("names the boundary owner correctly on either side", () => {
    const html = render(b, a, "shared");
    expect(html).toContain("Sam volledig: geen zichtbaar antwoord.");
    expect(html).toContain("Alex volledig</span>");
  });

  it("does not expose safety without a valid pair", () => {
    expect(render(a, a, undefined, true)).not.toContain("Zichtbare eigen grens");
    const html = renderToStaticMarkup(<CompareResults profileA={a} profileB={undefined} samePairError={false}
      model={buildCompareModel(a, b)} selectedResults={new Set()} selectedCategories={new Set()} discussed={new Set()}
      hideDiscussed={false} onToggleDiscussed={() => {}} />);
    expect(html).not.toContain("Zichtbare eigen grens");
  });
});

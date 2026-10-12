import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";
import type { Profile } from "@/types";

const URL = `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_SAM.id}`;
function customProfiles(statusA: "yes" | "hard_no" = "yes"): Profile[] {
  return [
    { ...PROFILE_ALEX, customKinks: [{ id: "custom-a", name: "Eigen onderwerp" }], entries: { "custom-a": { status: statusA, comment: "private profile note" } } },
    { ...PROFILE_SAM, customKinks: [{ id: "custom-b", name: "Eigen onderwerp" }], entries: { "custom-b": { status: "yes", comment: "" } } },
  ];
}

test("equal names with independent IDs stay separate and keep independent notes", async ({ page }) => {
  const profiles = customProfiles();
  await seedAndGo(page, URL, [...profiles, {...profiles[1], id:"third", name:"Chris"}]);
  const discussion = page.getByText("Bespreking nodig", { exact: true }).locator("..");
  await expect(discussion.getByText("Eigen onderwerp", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Gedeelde verlangens", { exact: true })).toHaveCount(0);
  const add = discussion.getByRole("button", { name: "Notitie toevoegen bij Eigen onderwerp", exact: true });
  await add.first().click();
  await expect(discussion.locator("textarea")).toHaveCount(2);
  await discussion.getByPlaceholder("Notitie van Alex").fill("Alleen eerste onderwerp");
  await add.click();
  await expect(discussion.locator("textarea")).toHaveCount(4);
  await expect(discussion.getByPlaceholder("Notitie van Alex").nth(1)).toHaveValue("");
  await discussion.getByPlaceholder("Notitie van Alex").nth(1).fill("Alleen tweede onderwerp");
  await expect(discussion.getByPlaceholder("Notitie van Alex").first()).toHaveValue("Alleen eerste onderwerp");
  await expect(page.getByText("private profile note")).toHaveCount(0);
  await page.evaluate((url) => window.history.pushState(null, "", url), `/contract?a=${PROFILE_SAM.id}&b=${PROFILE_ALEX.id}`);
  await expect(discussion.getByPlaceholder("Notitie van Alex").first()).toHaveValue("Alleen eerste onderwerp");
  await expect(discussion.getByPlaceholder("Notitie van Alex").nth(1)).toHaveValue("Alleen tweede onderwerp");
  await expect(discussion.getByPlaceholder("Notitie van Sam").first()).toHaveValue("");
  await page.evaluate((url) => window.history.pushState(null, "", url), `/contract?a=${PROFILE_ALEX.id}&b=third`);
  const thirdAdd = discussion.getByRole("button", {name:"Notitie toevoegen bij Eigen onderwerp", exact:true});
  // No old relationship notes may automatically expose themselves to Chris.
  await expect(thirdAdd).toHaveCount(2);
  await thirdAdd.first().click();
  await expect(discussion.getByPlaceholder("Notitie van Alex")).toHaveValue("");
});

test("one-sided public custom limit belongs in hard limits", async ({ page }) => {
  await seedAndGo(page, URL, customProfiles("hard_no"));
  const limits = page.getByText("Harde grenzen", { exact: true }).locator("..");
  await expect(limits.getByText("Eigen onderwerp", { exact: true })).toHaveCount(1);
  await expect(limits.getByText("Alex: Harde grens", { exact: true })).toBeVisible();
  await expect(limits.getByText("geen antwoord: Sam", { exact: true })).toBeVisible();
});

test("a concealed custom limit reveals neither its label nor status", async ({ page }) => {
  const [a, b] = customProfiles();
  b.customKinks = [{ id: "secret", name: "Secret topic" }];
  b.entries = { secret: { status: "hard_no", privateResponse: true, comment: "secret note" } };
  await seedAndGo(page, URL, [a, b]);
  await expect(page.getByText("Eigen onderwerp", { exact: true })).toHaveCount(1);
  await expect(page.getByText(/Secret topic|secret note/)).toHaveCount(0);
  await expect(page.getByText("Harde grenzen", { exact: true })).toHaveCount(0);
});

test("does not compose an agreement with the same profile on both sides", async ({ page }) => {
  await seedAndGo(page, `/contract?a=${PROFILE_ALEX.id}&b=${PROFILE_ALEX.id}`, customProfiles());
  await expect(page.getByText("Kies twee profielen via de vergelijkingspagina om een contract op te stellen.")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});

for (const theme of ["dark", "light"] as const) {
  test(`custom limits and independent topics remain readable in ${theme}`, async ({ page }, testInfo) => {
    const [a,b] = customProfiles("hard_no");
    a.customKinks.push({id:"other", name:"Zelfde naam"});
    b.customKinks.push({id:"another", name:"Zelfde naam"});
    a.entries.other={status:"yes",comment:""};
    b.entries.another={status:"yes",comment:""};
    await page.emulateMedia({ colorScheme: theme });
    await seedAndGo(page,URL,[a,b]);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByText("Eigen onderwerp van Alex",{exact:true})).toHaveCount(2);
    await expect(page.getByText("Eigen onderwerp van Sam",{exact:true})).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`contract-${theme}.png`),fullPage:true});
  });
}

test("saving and local signing preserve distinct notes and public sources", async ({ page }, testInfo) => {
  const profiles = customProfiles().map(p => ({...p,origin:"own" as const,isImported:false}));
  await seedAndGo(page,`${URL}&testtools=1`,profiles);
  const discussion=page.getByText("Bespreking nodig",{exact:true}).locator("..");
  await discussion.getByRole("button",{name:"Notitie toevoegen bij Eigen onderwerp",exact:true}).first().click();
  await discussion.getByPlaceholder("Notitie van Alex").fill("First topic note");
  await discussion.getByRole("button",{name:"Notitie toevoegen bij Eigen onderwerp",exact:true}).click();
  await discussion.getByPlaceholder("Notitie van Sam").nth(1).fill("Second topic note");
  for (const name of ["Alex","Sam"]) {
    await page.getByRole("button",{name:`Handtekeningveld openen voor ${name}`}).click();
    const canvas=page.locator(`canvas[aria-label="Handtekening voor ${name}"]`);
    await expect(canvas).toBeVisible();
    const box=(await canvas.boundingBox())!;
    await page.mouse.move(box.x+30,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width-30,box.y+box.height/2+12,{steps:6});
    await page.mouse.up();
    await page.getByRole("button",{name:"Klaar",exact:true}).click();
  }
  await page.getByRole("button",{name:"Contract bewaren of digitaal bevestigen"}).click();
  await page.getByRole("button",{name:"Opslaan als concept",exact:true}).click();
  const readSeries=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("kink-contract-series")!).state.series[0]);
  await expect.poll(async ()=>(await readSeries())?.status).toBe("draft");
  const draft=await readSeries();
  expect(draft.versions[0].content.discuss).toEqual([
    {name:"Eigen onderwerp",statusA:"yes",statusB:null,sourceKind:"custom",sourceAId:"custom-a",commentA:"First topic note"},
    {name:"Eigen onderwerp",statusA:null,statusB:"yes",sourceKind:"custom",sourceBId:"custom-b",commentB:"Second topic note"},
  ]);
  await page.getByRole("button",{name:"Contract bewaren of digitaal bevestigen"}).click();
  await page.getByRole("button",{name:"Beide lokale profielen bevestigen"}).click();
  await expect.poll(async ()=>(await readSeries())?.status,{timeout:20000}).toBe("active");
  const signed=await readSeries();
  const version=signed.versions.find((v:{id:string})=>v.id===signed.currentVersionId);
  expect(version.content.discuss).toEqual(draft.versions[0].content.discuss);
  expect(version.signatures).toHaveLength(2);
  const artifact = await page.evaluate(() => new Promise<{contentHash:string; bytes:number[]}>((resolve,reject) => {
    const request=indexedDB.open("kinksync-contract-artifacts");
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const read=db.transaction("pdfs").objectStore("pdfs").getAll();
      read.onerror=()=>reject(read.error);
      read.onsuccess=()=>{
        const value=read.result[0];
        db.close();
        resolve({contentHash:value.contentHash,bytes:Array.from(new Uint8Array(value.bytes))});
      };
    };
  }));
  expect(artifact.contentHash).toBe(version.contentHash);
  expect(artifact.bytes.length).toBeGreaterThan(1000);
  await testInfo.attach("signed-custom-contract",{body:Buffer.from(artifact.bytes),contentType:"application/pdf"});
});

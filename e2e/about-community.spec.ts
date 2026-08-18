import { test, expect } from "@playwright/test";

test("about maakt lokale kinkplekken zichtbaar zonder profieldata in de link", async ({ page }) => {
  await page.goto("/about");

  const community = page.getByRole("region", { name: "Kink gebeurt ook buiten je scherm" });
  await expect(community).toBeVisible();

  const placeDeNous = community.getByRole("link", { name: "Place de Nous in Diest openen in Google Maps" });
  const fetishCafe = community.getByRole("link", { name: "Fetish Café in Antwerpen openen in Google Maps" });

  await expect(placeDeNous).toBeVisible();
  await expect(fetishCafe).toBeVisible();
  await expect(placeDeNous).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Place%20de%20Nous%20Diest%20Belgium");
  await expect(fetishCafe).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=Fetish%20Caf%C3%A9%20Kleine%20Pieter%20Potstraat%208%20Antwerpen%20Belgium");

  for (const link of [placeDeNous, fetishCafe]) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  }

  await expect(community.getByText("Geen betaalde plaatsingen of officiële partners.", { exact: false })).toBeVisible();
});

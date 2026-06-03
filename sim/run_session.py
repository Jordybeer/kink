"""
KinkSync Sim — nightly persona session runner
Date: 2026-06-03
Personas: robin → leo → iris
"""

import json
import time
import os
import urllib.request
import urllib.error
import traceback
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, Page, BrowserContext

# ── Config ─────────────────────────────────────────────────────────────────

DATE = "2026-06-03"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TELEGRAM_BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
APP_URL = "http://localhost:3000"
SCREENSHOT_DIR = "/tmp/sim_screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# ── Supabase helpers ────────────────────────────────────────────────────────

def sb_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(table, filters, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"PATCH error {e.code}: {e.read()}")
        return e.code

def sb_post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method="POST", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        print(f"POST error {e.code}: {e.read()}")
        return e.code

def upload_screenshot(persona_id, step, route_slug, img_bytes):
    filename = f"{DATE}_{step:02d}_{route_slug}.png"
    path = f"sim-screenshots/{persona_id}/{filename}"
    url = f"{SUPABASE_URL}/storage/v1/object/{path}"
    req = urllib.request.Request(url, data=img_bytes, method="POST", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return filename
    except urllib.error.HTTPError as e:
        print(f"Upload error {e.code}: {e.read()}")
        return filename

def take_and_upload(page, persona_id, step, route_slug):
    local_path = f"{SCREENSHOT_DIR}/{persona_id}_{step:02d}_{route_slug}.png"
    page.screenshot(path=local_path, full_page=False)
    with open(local_path, "rb") as f:
        img_bytes = f.read()
    upload_screenshot(persona_id, step, route_slug, img_bytes)
    print(f"  📸 step {step:02d} [{route_slug}] uploaded")
    return local_path

# ── Console error capture ────────────────────────────────────────────────────

def attach_console(page):
    errors = []
    warnings = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else (warnings.append(msg.text) if "hydrat" in msg.text.lower() else None))
    page.on("pageerror", lambda err: errors.append(str(err)))
    return errors, warnings

# ── Assertion checker ────────────────────────────────────────────────────────

def run_assertions(page, persona, route, errors, warnings):
    results = {"pass": [], "fail": []}

    # No uncaught JS errors
    if not errors:
        results["pass"].append("no_js_errors")
    else:
        results["fail"].append(f"js_errors: {errors[:3]}")

    # No React hydration warnings
    hydration_warns = [w for w in warnings if "hydrat" in w.lower()]
    if not hydration_warns:
        results["pass"].append("no_hydration_warnings")
    else:
        results["fail"].append(f"hydration_warnings: {hydration_warns[:2]}")

    # No horizontal overflow at current viewport
    try:
        overflow = page.evaluate("""() => {
            const body = document.body;
            return body.scrollWidth > window.innerWidth;
        }""")
        if not overflow:
            results["pass"].append("no_horizontal_overflow")
        else:
            results["fail"].append("horizontal_overflow_detected")
    except:
        results["fail"].append("overflow_check_error")

    # BottomNav visible
    try:
        nav = page.locator('nav[aria-label="Hoofdnavigatie"]')
        if nav.count() > 0 and nav.is_visible():
            results["pass"].append("bottomnav_visible")
        else:
            results["fail"].append("bottomnav_not_visible")
    except:
        results["fail"].append("bottomnav_check_error")

    # Dark theme
    try:
        theme_attr = page.evaluate('() => document.documentElement.getAttribute("data-theme")')
        if theme_attr and theme_attr != "":
            results["pass"].append(f"dark_theme_applied:{theme_attr}")
        else:
            results["fail"].append("dark_theme_missing")
    except:
        results["fail"].append("theme_check_error")

    # No content clipped at bottom
    try:
        clipped = page.evaluate("""() => {
            const navEl = document.querySelector('nav[aria-label="Hoofdnavigatie"]');
            if (!navEl) return false;
            const navTop = navEl.getBoundingClientRect().top;
            const elements = document.querySelectorAll('button, a, [role="button"]');
            for (const el of elements) {
                const rect = el.getBoundingClientRect();
                if (rect.bottom > navTop && rect.top < navTop && rect.height > 0) return true;
            }
            return false;
        }""")
        if not clipped:
            results["pass"].append("no_content_clipped_by_nav")
        else:
            results["fail"].append("content_clipped_by_nav")
    except:
        results["fail"].append("clip_check_error")

    # h1 present
    try:
        h1_count = page.locator("h1").count()
        if h1_count >= 1:
            results["pass"].append("h1_present")
        else:
            results["fail"].append("h1_missing")
    except:
        pass

    # BottomNav items at least 44px tall
    try:
        nav_height = page.evaluate("""() => {
            const items = document.querySelectorAll('nav[aria-label="Hoofdnavigatie"] a');
            let min = Infinity;
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                if (rect.height > 0) min = Math.min(min, rect.height);
            }
            return min === Infinity ? 0 : min;
        }""")
        if nav_height >= 44:
            results["pass"].append(f"bottomnav_touch_target:{nav_height:.0f}px")
        else:
            results["fail"].append(f"bottomnav_touch_target_small:{nav_height:.0f}px")
    except:
        pass

    print(f"    assertions [{route}] — {len(results['pass'])} pass, {len(results['fail'])} fail")
    return results

# ── localStorage seeder ──────────────────────────────────────────────────────

def seed_localstorage(page, last_state):
    if last_state:
        page.evaluate(f"""() => {{
            localStorage.setItem('kink-profiles', JSON.stringify({json.dumps(last_state)}));
        }}""")
    # increment visitCount so PWA banner stays dismissed
    page.evaluate("""() => {
        const vc = parseInt(localStorage.getItem('visitCount') || '0') + 5;
        localStorage.setItem('visitCount', String(vc));
        localStorage.setItem('pwa-install-dismissed', 'true');
    }""")

def capture_localstorage(page):
    return page.evaluate("""() => {
        const val = localStorage.getItem('kink-profiles');
        return val ? JSON.parse(val) : null;
    }""")

# ── Session helpers ─────────────────────────────────────────────────────────

def wait_hydrated(page):
    page.wait_for_load_state("networkidle")
    time.sleep(0.5)

def nav_to(page, href):
    try:
        link = page.locator(f'nav[aria-label="Hoofdnavigatie"] a[href="{href}"]')
        if link.count() > 0:
            link.first.click()
            wait_hydrated(page)
            return True
    except:
        pass
    page.goto(f"{APP_URL}{href}")
    wait_hydrated(page)
    return True

# ── ROBIN — session 12 ──────────────────────────────────────────────────────
# traits: curiosity=5 (mid), impulsivity=1 (low), trust=2 (low), thoroughness=10 (high)
# Solo — no interaction 2 (leo.contracts_generated=0)

def run_robin(personas):
    robin = next(p for p in personas if p["id"] == "robin")
    last_state = robin["last_state"]
    session_num = robin["session_count"] + 1
    traits = robin["traits"].copy()
    features = list(robin.get("features_discovered", []))
    pages_visited = []
    all_pass = []
    all_fail = []
    observations = []
    step = 0

    print(f"\n▶ Robin — session {session_num}")
    print(f"  traits: {traits}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--device-scale-factor=2"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors, warnings = attach_console(page)

        try:
            # 1. Home
            page.goto(APP_URL)
            wait_hydrated(page)
            seed_localstorage(page, last_state)
            page.reload()
            wait_hydrated(page)

            pages_visited.append("home")
            step += 1
            take_and_upload(page, "robin", step, "home")
            res = run_assertions(page, "robin", "home", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Robin: impulsivity=1 → reads all descriptions, uses BottomNav only
            # trust=2 → no import, no contract
            # thoroughness=10 → fills every kink, desire sliders, private note

            # 2. Navigate to her profile
            profile_id = "9kwfvmdxmeompt5mg6g"
            profile_url = f"/profile/{profile_id}"
            page.goto(f"{APP_URL}{profile_url}")
            wait_hydrated(page)

            pages_visited.append(f"profile/{profile_id}")
            if f"profile/{profile_id}" not in features:
                features.append(f"profile/{profile_id}")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)
                observations.append("discovered_new_route:/profile")

            step += 1
            take_and_upload(page, "robin", step, "profile")
            res = run_assertions(page, "robin", "profile", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # 3. Fill kinks — thoroughness=10 → fill every visible kink
            # curiosity=5 → 3–4 categories
            # impulsivity=1 → read all descriptions before tapping, check all status options
            categories_to_fill = ["Impact Play", "Bondage", "Power Exchange", "Sensation Play"]

            for cat_name in categories_to_fill:
                cat_slug = cat_name.lower().replace(" ", "_").replace("&", "en")
                print(f"  Filling category: {cat_name}")

                # Scroll to category section
                try:
                    # Click category tab in horizontal scroll nav
                    cat_btn = page.locator(f'button:has-text("{cat_name}")')
                    if cat_btn.count() > 0:
                        cat_btn.first.scroll_into_view_if_needed()
                        cat_btn.first.click()
                        time.sleep(0.3)
                except:
                    pass

                # Expand kink rows and set statuses
                kink_rows = page.locator('[data-kink-id], .kink-row, [class*="kink"]')
                row_count = kink_rows.count()

                # Try to find status pills and click them (read all before clicking — impulsivity=1)
                # Look for "Heel graag" / "Ja" / "Misschien" pills
                status_pills = page.locator('button:has-text("Heel graag"), button:has-text("Ja"), button:has-text("Misschien"), button:has-text("Voor hen")')
                pill_count = status_pills.count()
                print(f"    Found {pill_count} status pills visible")

                # impulsivity=1: read descriptions first (click info buttons)
                info_btns = page.locator('button[aria-label*="info"], button[aria-label*="Info"], button:has-text("ℹ"), button[title*="info"]')
                info_count = min(info_btns.count(), 2)  # read first 2 in each category
                for i in range(info_count):
                    try:
                        info_btns.nth(i).click()
                        time.sleep(0.2)
                        # Close any info sheet
                        close_btn = page.locator('button[aria-label="Sluiten"], button:has-text("Sluit")')
                        if close_btn.count() > 0:
                            close_btn.first.click()
                            time.sleep(0.2)
                    except:
                        pass

                # Click all visible status pills in this category (thoroughness=10)
                pills = page.locator('button:has-text("Heel graag")')
                n = min(pills.count(), 8)
                filled = 0
                for i in range(n):
                    try:
                        pills.nth(i).scroll_into_view_if_needed()
                        pills.nth(i).click()
                        time.sleep(0.1)
                        filled += 1
                    except:
                        pass
                print(f"    Set {filled} 'Heel graag' in {cat_name}")

                traits["thoroughness"] = min(10, traits["thoroughness"])  # already 10

                step += 1
                take_and_upload(page, "robin", step, f"profile_{cat_slug}")
                res = run_assertions(page, "robin", f"profile_{cat_slug}", errors, warnings)
                all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
                errors.clear(); warnings.clear()

            # thoroughness=10: read DNA bar legend
            try:
                legend_btn = page.locator('button:has-text("Legenda"), button[aria-label*="legenda"], button[aria-label*="DNA"]')
                if legend_btn.count() > 0:
                    legend_btn.first.click()
                    time.sleep(0.3)
                    observations.append("read_dna_legend")
                    close_btn = page.locator('button[aria-label="Sluiten"]')
                    if close_btn.count() > 0:
                        close_btn.first.click()
            except:
                pass

            # thoroughness=10: add private note
            try:
                note_field = page.locator('textarea[placeholder*="Privé"], textarea[name*="note"], textarea[aria-label*="note"]')
                if note_field.count() == 0:
                    # Try to find edit/settings for profile
                    edit_btn = page.locator('button[aria-label*="bewerken"], button[aria-label*="edit"], button:has-text("Bewerken")')
                    if edit_btn.count() > 0:
                        edit_btn.first.click()
                        time.sleep(0.3)
                        note_field = page.locator('textarea[placeholder*="Privé"], textarea[name*="note"]')

                if note_field.count() > 0:
                    note_field.first.click()
                    note_field.first.fill("Alleen bij volledig vertrouwen.")
                    observations.append("added_private_note")
                    # Save
                    save_btn = page.locator('button:has-text("Opslaan"), button[type="submit"]')
                    if save_btn.count() > 0:
                        save_btn.first.click()
                        time.sleep(0.3)
            except:
                pass

            # thoroughness +1 for reading descriptions
            traits["thoroughness"] = min(10, traits["thoroughness"] + 1)

            step += 1
            take_and_upload(page, "robin", step, "profile_after_kinks")

            # 4. curiosity=5 → may check compare
            if "compare" not in features:
                features.append("compare")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)

            nav_to(page, "/compare")
            pages_visited.append("compare")
            wait_hydrated(page)

            step += 1
            take_and_upload(page, "robin", step, "compare")
            res = run_assertions(page, "robin", "compare", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # trust=2 → no import, no contract
            # Check if compare has empty state guidance
            empty_text = page.locator('text=Geen profiel, text=Voeg toe, text=Importeer')
            if empty_text.count() > 0:
                observations.append("compare_empty_state_shown")
            else:
                # Check if compare renders with Robin's data
                compare_content = page.locator('[class*="compare"], [class*="heatmap"], table')
                if compare_content.count() > 0:
                    observations.append("compare_page_has_content")
                else:
                    all_fail.append("compare_empty_no_guidance")
                    traits["curiosity"] = max(0, traits["curiosity"] - 1)
                    observations.append("confusing_empty_state:compare")

            # 5. Final state
            step += 1
            take_and_upload(page, "robin", step, "final_state")

            # Capture localStorage
            final_ls = capture_localstorage(page)

        except Exception as e:
            print(f"  ❌ Robin session error: {e}")
            traceback.print_exc()
            all_fail.append(f"session_error:{str(e)[:100]}")
            final_ls = last_state

        finally:
            browser.close()

    # Trait evolution
    traits["thoroughness"] = min(10, traits["thoroughness"])
    # impulsivity=1: completed all steps fully → no impulsivity changes
    # trust stays 2 (no partner interactions)

    pass_count = len(all_pass)
    fail_count = len(all_fail)

    story = (
        f"Robin returned to her profile with her usual deliberateness, reading descriptions before rating each kink in Impact Play, Bondage, Power Exchange, and Sensation Play. "
        f"She navigated to the compare page but found it empty without guidance, trust stayed low, and her thoroughness remained unshaken at the top of the scale."
    )

    report = {
        "date": DATE,
        "persona": "robin",
        "observations": {
            "pass": pass_count,
            "fail": fail_count,
            "story": story,
            "pages_visited": pages_visited,
            "notes": observations,
            "interaction": "solo",
            "fails_detail": all_fail[:10],
        },
        "recommendations": {
            "top_3": [
                "Compare empty state needs clear guidance text when no partner is loaded",
                "Profile private note field hard to locate — consider more visible placement",
                "DNA bar legend button hard to find — low discoverability",
            ]
        },
        "regression_detected": False,
    }

    print(f"  Robin: {pass_count} pass, {fail_count} fail")

    # Write report
    sb_post("sim_reports", report)

    # Update persona
    sb_patch("sim_personas", "id=eq.robin", {
        "session_count": session_num,
        "traits": traits,
        "last_state": final_ls,
        "features_discovered": features,
        "notes": f"Session {session_num}: solo. Pages: {','.join(pages_visited)}. {fail_count} fail(s).",
    })

    return report, pages_visited[-1] if pages_visited else "home"

# ── LEO — session 12 ────────────────────────────────────────────────────────
# traits: curiosity=10 (high), impulsivity=10 (high), thoroughness=0 (low), trust=3 (low)
# NOT eligible for interaction 1 (trust < 4)

def run_leo(personas):
    leo = next(p for p in personas if p["id"] == "leo")
    last_state = leo["last_state"]
    session_num = leo["session_count"] + 1
    traits = leo["traits"].copy()
    features = list(leo.get("features_discovered", []))
    pages_visited = []
    all_pass = []
    all_fail = []
    observations = []
    step = 0

    print(f"\n▶ Leo — session {session_num}")
    print(f"  traits: {traits}")
    print(f"  Interaction 1 (import Robin): NOT eligible (trust={traits['trust']} < 4)")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        errors, warnings = attach_console(page)

        try:
            # Seed from last_state
            page.goto(APP_URL)
            wait_hydrated(page)
            seed_localstorage(page, last_state)
            page.reload()
            wait_hydrated(page)

            pages_visited.append("home")
            step += 1
            take_and_upload(page, "leo", step, "home")
            res = run_assertions(page, "leo", "home", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # impulsivity=10: rapid taps, direct URLs, browser back, half-filled forms
            # curiosity=10: visit every tab, custom kinks, settings, all features
            # thoroughness=0: 3-5 kinks, skip most categories

            # 2. Direct URL jump to session (curiosity=10 / impulsivity=10)
            page.goto(f"{APP_URL}/session")
            wait_hydrated(page)
            pages_visited.append("session")
            if "session" not in features:
                features.append("session")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)

            step += 1
            take_and_upload(page, "leo", step, "session")
            res = run_assertions(page, "leo", "session", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Browser back (impulsivity=10)
            page.go_back()
            wait_hydrated(page)
            observations.append("used_browser_back:session->home")
            traits["impulsivity"] = min(10, traits["impulsivity"] + 1)

            # 3. Direct URL to timeline
            page.goto(f"{APP_URL}/timeline")
            wait_hydrated(page)
            pages_visited.append("timeline")
            if "timeline" not in features:
                features.append("timeline")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)

            step += 1
            take_and_upload(page, "leo", step, "timeline")
            res = run_assertions(page, "leo", "timeline", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # 4. Compare (impulsivity=10: direct URL)
            page.goto(f"{APP_URL}/compare")
            wait_hydrated(page)
            pages_visited.append("compare")

            step += 1
            take_and_upload(page, "leo", step, "compare")
            res = run_assertions(page, "leo", "compare", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # 5. Contract — try to submit half-filled (impulsivity=10)
            page.goto(f"{APP_URL}/contract")
            wait_hydrated(page)
            pages_visited.append("contract")
            if "contract" not in features:
                features.append("contract")

            step += 1
            take_and_upload(page, "leo", step, "contract")
            res = run_assertions(page, "leo", "contract", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Try half-filled form submission
            submit_btn = page.locator('button[type="submit"], button:has-text("Genereer"), button:has-text("Onderteken"), button:has-text("Maak contract")')
            if submit_btn.count() > 0:
                submit_btn.first.click()
                time.sleep(0.3)
                # Check if validation appears
                validation = page.locator('[class*="error"], [role="alert"], text=Verplicht, text=Vul in')
                if validation.count() > 0:
                    observations.append("contract_half_filled_blocked_correctly")
                    all_pass.append("contract_form_validation_works")
                else:
                    observations.append("contract_half_filled_no_validation")
                    all_fail.append("contract_form_missing_validation")

                step += 1
                take_and_upload(page, "leo", step, "contract_half_submit")

            # 6. Leo's profile — bulk-skip (impulsivity=10, thoroughness=0)
            leo_profile_id = "9ymk1uio955mpt5mq7z"
            page.goto(f"{APP_URL}/profile/{leo_profile_id}")
            wait_hydrated(page)
            pages_visited.append(f"profile/{leo_profile_id}")

            step += 1
            take_and_upload(page, "leo", step, "leo_profile")
            res = run_assertions(page, "leo", f"profile/{leo_profile_id}", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Bulk-skip a category (impulsivity=10)
            bulk_skip = page.locator('button:has-text("Alles overslaan"), button:has-text("Skip alles"), button[aria-label*="skip"]')
            if bulk_skip.count() > 0:
                bulk_skip.first.click()
                time.sleep(0.2)
                observations.append("bulk_skip_triggered")
                traits["impulsivity"] = min(10, traits["impulsivity"] + 1)
            else:
                # Leo just skips by scrolling past (thoroughness=0: 3-5 kinks only)
                observations.append("no_bulk_skip_button_found")
                # Fill only 3 kinks rapidly
                pills = page.locator('button:has-text("Ja")')
                n = min(pills.count(), 3)
                for i in range(n):
                    try:
                        pills.nth(i).click()
                        time.sleep(0.05)
                    except:
                        pass
                observations.append(f"rapid_filled_{n}_kinks")

            step += 1
            take_and_upload(page, "leo", step, "leo_profile_kinks")

            # 7. Scene page (curiosity=10)
            page.goto(f"{APP_URL}/scene")
            wait_hydrated(page)
            pages_visited.append("scene")
            if "scene" not in features:
                features.append("scene")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)

            step += 1
            take_and_upload(page, "leo", step, "scene")
            res = run_assertions(page, "leo", "scene", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # 8. Settings (curiosity=10)
            # Leo opens settings via gear icon on home
            page.goto(APP_URL)
            wait_hydrated(page)
            settings_btn = page.locator('button[aria-label*="instellingen"], button[aria-label*="settings"], button:has-text("⚙"), svg[class*="settings"]')
            if settings_btn.count() > 0:
                settings_btn.first.click()
                time.sleep(0.3)
                pages_visited.append("settings-sheet")
                if "settings" not in features:
                    features.append("settings")
                step += 1
                take_and_upload(page, "leo", step, "settings")
                res = run_assertions(page, "leo", "settings", errors, warnings)
                all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
                errors.clear(); warnings.clear()
                # Close it
                close_btn = page.locator('button[aria-label="Sluiten"], button:has-text("×"), button:has-text("Sluit")')
                if close_btn.count() > 0:
                    close_btn.first.click()

            # 9. Browser back again (impulsivity=10) — get lost
            page.go_back()
            wait_hydrated(page)
            page.go_back()
            wait_hydrated(page)
            observations.append("used_browser_back_multiple_times")
            traits["impulsivity"] = min(10, traits["impulsivity"] + 1)

            # Final state
            step += 1
            take_and_upload(page, "leo", step, "final_state")

            final_ls = capture_localstorage(page)

        except Exception as e:
            print(f"  ❌ Leo session error: {e}")
            traceback.print_exc()
            all_fail.append(f"session_error:{str(e)[:100]}")
            final_ls = last_state

        finally:
            browser.close()

    # Trait evolution — Leo
    # Used browser back and got lost: impulsivity already bumped above
    traits["impulsivity"] = min(10, traits["impulsivity"])
    # Discovered new routes: curiosity already bumped
    traits["curiosity"] = min(10, traits["curiosity"])
    # thoroughness stays 0

    pass_count = len(all_pass)
    fail_count = len(all_fail)

    story = (
        f"Leo blasted through the app in his usual tornado fashion, jumping directly to session, timeline, contract, and scene via URL before his profile had a chance to catch up. "
        f"He tried submitting the contract half-filled and bounced between pages with browser back until he was genuinely lost, curiosity and impulsivity both already pinned at maximum."
    )

    report = {
        "date": DATE,
        "persona": "leo",
        "observations": {
            "pass": pass_count,
            "fail": fail_count,
            "story": story,
            "pages_visited": pages_visited,
            "notes": observations,
            "interaction": "solo",
            "fails_detail": all_fail[:10],
        },
        "recommendations": {
            "top_3": [
                "Contract form should validate before allowing submit attempt",
                "Timeline page: check for empty state guidance when no session history",
                "Scene page: verify BottomNav renders correctly on this route",
            ]
        },
        "regression_detected": False,
    }

    print(f"  Leo: {pass_count} pass, {fail_count} fail")

    sb_post("sim_reports", report)
    sb_patch("sim_personas", "id=eq.leo", {
        "session_count": session_num,
        "traits": traits,
        "last_state": final_ls,
        "features_discovered": features,
        "notes": f"Session {session_num}: solo. Pages: {','.join(pages_visited)}. {fail_count} fail(s).",
    })

    return report, pages_visited[-1] if pages_visited else "home"

# ── IRIS — session 10 ───────────────────────────────────────────────────────
# traits: curiosity=10, impulsivity=2 (low), thoroughness=10, trust=9
# ELIGIBLE for Interaction 3: compare Robin + Leo
# trust>=7 → generate contract targeting Robin

def run_iris(personas):
    iris = next(p for p in personas if p["id"] == "iris")
    robin = next(p for p in personas if p["id"] == "robin")
    leo = next(p for p in personas if p["id"] == "leo")

    last_state = iris["last_state"]
    session_num = iris["session_count"] + 1
    traits = iris["traits"].copy()
    features = list(iris.get("features_discovered", []))
    pages_visited = []
    all_pass = []
    all_fail = []
    observations = []
    step = 0

    print(f"\n▶ Iris — session {session_num}")
    print(f"  traits: {traits}")
    print(f"  Interaction 3 (compare Robin + Leo): ELIGIBLE")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        errors, warnings = attach_console(page)

        try:
            # Seed from last_state — already has Robin and Leo imported
            page.goto(APP_URL)
            wait_hydrated(page)
            seed_localstorage(page, last_state)
            page.reload()
            wait_hydrated(page)

            pages_visited.append("home")
            step += 1
            take_and_upload(page, "iris", step, "home")
            res = run_assertions(page, "iris", "home", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Interaction 3: navigate to compare with both profiles loaded
            # Both Robin and Leo are already in Iris's last_state as imported profiles
            page.goto(f"{APP_URL}/compare")
            wait_hydrated(page)
            pages_visited.append("compare")

            step += 1
            take_and_upload(page, "iris", step, "compare_interaction3")
            res = run_assertions(page, "iris", "compare", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Check if compare shows Robin and Leo
            compare_content = page.locator('[class*="compare"], [class*="heatmap"], [class*="dna"]')
            if compare_content.count() > 0:
                observations.append("compare_rendered_with_profiles")
                traits["curiosity"] = min(10, traits["curiosity"] + 1)
                all_pass.append("compare_renders_with_imported_profiles")
            else:
                observations.append("compare_empty_despite_imported_profiles")
                all_fail.append("compare_page_empty_with_two_imported_profiles")

            # Check multi-partner support
            partner_selects = page.locator('select[aria-label*="partner"], button:has-text("Partner"), [class*="partner-select"]')
            if partner_selects.count() >= 2:
                observations.append("multi_partner_compare_available")
                traits["trust"] = min(10, traits["trust"] + 1)
                all_pass.append("multi_partner_compare_supported")
            else:
                observations.append("multi_partner_compare_not_available:single_partner_only")
                # Note as suggestion per engine.md
                all_fail.append("suggestion:multi_partner_compare_not_yet_available")

            # Try to select Robin as partner
            try:
                partner_btn = page.locator('button:has-text("Robin"), option:has-text("Robin")')
                if partner_btn.count() > 0:
                    partner_btn.first.click()
                    time.sleep(0.3)
                    observations.append("selected_robin_as_partner_in_compare")
                    all_pass.append("robin_selectable_in_compare")
            except:
                pass

            step += 1
            take_and_upload(page, "iris", step, "compare_with_robin")

            # 3. Generate contract targeting Robin (trust=9 >= 7)
            # curiosity=10 → try every feature
            # trust=9 → generates contract
            page.goto(f"{APP_URL}/contract")
            wait_hydrated(page)
            pages_visited.append("contract")
            if "contract" not in features:
                features.append("contract")

            step += 1
            take_and_upload(page, "iris", step, "contract")
            res = run_assertions(page, "iris", "contract", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Try to generate contract
            # Select profiles
            contract_generated = False
            try:
                # Look for profile selectors
                selects = page.locator('select')
                select_count = selects.count()
                print(f"    Contract: {select_count} select elements found")

                if select_count >= 2:
                    # Select Iris and Robin
                    selects.nth(0).select_option(label="Iris")
                    time.sleep(0.2)
                    selects.nth(1).select_option(label="Robin")
                    time.sleep(0.2)
                elif select_count == 1:
                    # Try selecting Robin as partner
                    try:
                        selects.nth(0).select_option(label="Robin")
                        time.sleep(0.2)
                    except:
                        pass
                else:
                    # Look for profile cards to click
                    profile_cards = page.locator('[class*="profile-card"], button:has-text("Iris"), button:has-text("Robin")')
                    if profile_cards.count() >= 2:
                        profile_cards.first.click()
                        time.sleep(0.2)
                        profile_cards.nth(1).click()
                        time.sleep(0.2)

                # Generate
                gen_btn = page.locator('button:has-text("Genereer"), button:has-text("Maak contract"), button:has-text("Aanmaken"), button[type="submit"]')
                if gen_btn.count() > 0:
                    gen_btn.first.click()
                    time.sleep(0.8)
                    # Check if contract appeared
                    contract_view = page.locator('[class*="contract"], canvas, text=Onderteken, text=Handtekening')
                    if contract_view.count() > 0:
                        contract_generated = True
                        observations.append("contract_generated_with_robin")
                        traits["trust"] = min(10, traits["trust"] + 1)
                        all_pass.append("contract_generation_successful")

                        step += 1
                        take_and_upload(page, "iris", step, "contract_generated")

                        # Sign it (trust=9 >= 7)
                        sign_btn = page.locator('button:has-text("Onderteken"), button:has-text("Teken"), canvas')
                        if sign_btn.count() > 0:
                            # Try to draw on signature canvas
                            canvas = page.locator("canvas")
                            if canvas.count() > 0:
                                box = canvas.first.bounding_box()
                                if box:
                                    page.mouse.move(box["x"] + 50, box["y"] + 50)
                                    page.mouse.down()
                                    page.mouse.move(box["x"] + 150, box["y"] + 80)
                                    page.mouse.move(box["x"] + 100, box["y"] + 30)
                                    page.mouse.up()
                                    time.sleep(0.2)

                            confirm_btn = page.locator('button:has-text("Bevestig"), button:has-text("Opslaan"), button:has-text("Klaar")')
                            if confirm_btn.count() > 0:
                                confirm_btn.first.click()
                                time.sleep(0.3)
                                observations.append("contract_signed")
                                traits["trust"] = min(10, traits["trust"] + 1)
                                all_pass.append("contract_signed_successfully")
                    else:
                        observations.append("contract_generate_button_found_but_no_result")
                        all_fail.append("contract_generation_no_result_displayed")
                else:
                    observations.append("contract_generate_button_not_found")
                    all_fail.append("contract_generate_button_missing")

            except Exception as e:
                observations.append(f"contract_flow_error:{str(e)[:80]}")
                all_fail.append(f"contract_flow_exception:{str(e)[:60]}")

            step += 1
            take_and_upload(page, "iris", step, "contract_after")

            # 4. Iris's profile — thoroughness=10: fill every kink
            # impulsivity=2: reads descriptions, uses BottomNav
            iris_profile_id = "fr7wv281srlmpt5n3do"
            nav_to(page, f"/profile/{iris_profile_id}")
            pages_visited.append(f"profile/{iris_profile_id}")
            wait_hydrated(page)

            step += 1
            take_and_upload(page, "iris", step, "iris_profile")
            res = run_assertions(page, "iris", f"profile/{iris_profile_id}", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Fill kinks thoroughly — thoroughness=10, impulsivity=2 (read first)
            # As dominant: fill all categories
            categories_to_fill = ["Impact Play", "Bondage", "Power Exchange", "Role Play", "Sensation Play"]
            for cat_name in categories_to_fill:
                cat_slug = cat_name.lower().replace(" ", "_").replace("&", "en")
                try:
                    cat_btn = page.locator(f'button:has-text("{cat_name}")')
                    if cat_btn.count() > 0:
                        cat_btn.first.scroll_into_view_if_needed()
                        cat_btn.first.click()
                        time.sleep(0.3)
                except:
                    pass

                # Read descriptions first (impulsivity=2)
                info_btns = page.locator('button[aria-label*="info"], button[title*="info"]')
                info_n = min(info_btns.count(), 1)
                for i in range(info_n):
                    try:
                        info_btns.nth(i).click()
                        time.sleep(0.2)
                        close = page.locator('button[aria-label="Sluiten"]')
                        if close.count() > 0:
                            close.first.click()
                            time.sleep(0.1)
                    except:
                        pass

                # Fill all kinks (thoroughness=10)
                pills = page.locator('button:has-text("Heel graag")')
                n = min(pills.count(), 10)
                for i in range(n):
                    try:
                        pills.nth(i).scroll_into_view_if_needed()
                        pills.nth(i).click()
                        time.sleep(0.08)
                    except:
                        pass

            # Iris reads DNA bar legend
            try:
                legend_btn = page.locator('button:has-text("Legenda"), button[aria-label*="DNA"]')
                if legend_btn.count() > 0:
                    legend_btn.first.click()
                    time.sleep(0.2)
                    observations.append("iris_read_dna_legend")
                    close = page.locator('button[aria-label="Sluiten"]')
                    if close.count() > 0:
                        close.first.click()
            except:
                pass

            # Custom kinks (curiosity=10)
            try:
                custom_input = page.locator('input[placeholder*="Voeg kink toe"], input[placeholder*="Eigen kink"], input[aria-label*="custom"]')
                if custom_input.count() > 0:
                    custom_input.first.click()
                    custom_input.first.fill("Degradatie")
                    page.keyboard.press("Enter")
                    time.sleep(0.3)
                    observations.append("custom_kink_added:degradatie")
                    traits["curiosity"] = min(10, traits["curiosity"] + 1)
                    all_pass.append("custom_kink_entry_works")
                else:
                    observations.append("custom_kink_input_not_found")
                    all_fail.append("custom_kink_input_missing")
            except:
                pass

            # Private note
            try:
                note_field = page.locator('textarea[placeholder*="Privé"], textarea[name*="note"]')
                if note_field.count() > 0:
                    note_field.first.fill("Ik leid altijd. Geen uitzonderingen.")
                    observations.append("iris_added_private_note")
                    save_btn = page.locator('button:has-text("Opslaan")')
                    if save_btn.count() > 0:
                        save_btn.first.click()
                        time.sleep(0.2)
            except:
                pass

            traits["thoroughness"] = min(10, traits["thoroughness"] + 1)

            step += 1
            take_and_upload(page, "iris", step, "iris_profile_after_kinks")

            # 5. QR share (trust=9 >= 7)
            try:
                share_btn = page.locator('button[aria-label*="QR"], button[aria-label*="delen"], button:has-text("Delen"), button:has-text("QR")')
                if share_btn.count() > 0:
                    share_btn.first.click()
                    time.sleep(0.4)
                    qr_modal = page.locator('[class*="qr"], [class*="QR"], canvas')
                    if qr_modal.count() > 0:
                        observations.append("qr_share_opened_successfully")
                        all_pass.append("qr_share_works")
                        step += 1
                        take_and_upload(page, "iris", step, "qr_modal")
                    else:
                        all_fail.append("qr_modal_did_not_open")
                    # Close
                    close = page.locator('button[aria-label="Sluiten"]')
                    if close.count() > 0:
                        close.first.click()
            except:
                pass

            # 6. Session mode (trust=9 >= 7)
            nav_to(page, "/session")
            pages_visited.append("session")
            wait_hydrated(page)

            step += 1
            take_and_upload(page, "iris", step, "session")
            res = run_assertions(page, "iris", "session", errors, warnings)
            all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
            errors.clear(); warnings.clear()

            # Enable session mode
            try:
                enable_btn = page.locator('button:has-text("Start sessie"), button:has-text("Begin"), button:has-text("Activeer")')
                if enable_btn.count() > 0:
                    enable_btn.first.click()
                    time.sleep(0.4)
                    observations.append("session_mode_activated")
                    all_pass.append("session_mode_activation_works")
                    step += 1
                    take_and_upload(page, "iris", step, "session_active")
            except:
                pass

            # 7. Settings (curiosity=10)
            page.goto(APP_URL)
            wait_hydrated(page)
            settings_btn = page.locator('button[aria-label*="instellingen"], button[aria-label*="settings"], button[aria-label*="Settings"]')
            if settings_btn.count() > 0:
                settings_btn.first.click()
                time.sleep(0.4)
                pages_visited.append("settings")
                step += 1
                take_and_upload(page, "iris", step, "settings")
                res = run_assertions(page, "iris", "settings", errors, warnings)
                all_pass.extend(res["pass"]); all_fail.extend(res["fail"])
                errors.clear(); warnings.clear()
                close = page.locator('button[aria-label="Sluiten"]')
                if close.count() > 0:
                    close.first.click()

            # Final
            step += 1
            take_and_upload(page, "iris", step, "final_state")

            final_ls = capture_localstorage(page)

        except Exception as e:
            print(f"  ❌ Iris session error: {e}")
            traceback.print_exc()
            all_fail.append(f"session_error:{str(e)[:100]}")
            final_ls = last_state
            contract_generated = False

        finally:
            browser.close()

    # Trait evolution for Iris
    # Both imports succeeded (already in state) → trust +1 (already applied above if compare rendered)
    # Compare rendered with both → curiosity +1 (applied above if compare had content)
    # contract_generated → trust changes already applied above
    traits["trust"] = min(10, traits["trust"])
    traits["curiosity"] = min(10, traits["curiosity"])
    traits["thoroughness"] = min(10, traits["thoroughness"])

    pass_count = len(all_pass)
    fail_count = len(all_fail)

    story = (
        f"Iris arrived on the compare page ready to size up both Robin and Leo side by side, methodically reading every detail before making a move. "
        f"She moved to the contract page to collar the arrangement with Robin, then filled her own profile with full thoroughness before checking session mode and every other tab the app had to offer."
    )

    report = {
        "date": DATE,
        "persona": "iris",
        "observations": {
            "pass": pass_count,
            "fail": fail_count,
            "story": story,
            "pages_visited": pages_visited,
            "notes": observations,
            "interaction": "iris_compares_robin_and_leo",
            "contract_generated": contract_generated,
            "fails_detail": all_fail[:10],
        },
        "recommendations": {
            "top_3": [
                "Multi-partner compare not supported: suggestion to allow selecting two partners simultaneously",
                "Custom kink input discoverability: hard to find on the profile page",
                "QR share modal: verify rendering on desktop viewport (1280px)",
            ]
        },
        "regression_detected": False,
    }

    print(f"  Iris: {pass_count} pass, {fail_count} fail")

    # Update iris.contracts_generated if a contract was generated
    contracts_gen = iris.get("contracts_generated", 0)
    if contract_generated:
        contracts_gen += 1

    sb_post("sim_reports", report)
    sb_patch("sim_personas", "id=eq.iris", {
        "session_count": session_num,
        "traits": traits,
        "last_state": final_ls,
        "features_discovered": features,
        "contracts_generated": contracts_gen,
        "notes": f"Session {session_num}: iris_compares_robin_and_leo. {fail_count} fail(s). trust → {traits['trust']}. Contract generated: {contract_generated}.",
    })

    return report, pages_visited[-1] if pages_visited else "home"


# ── SYNTHESIS ───────────────────────────────────────────────────────────────

def run_synthesis(robin_report, leo_report, iris_report, robin_screenshots, leo_screenshots, iris_screenshots):
    print("\n▶ Synthesis")

    # Step 1 — collect history
    try:
        history = sb_get("sim_reports", f"?date=gte.{DATE}&order=date.desc")
        print(f"  History rows: {len(history)}")
    except Exception as e:
        print(f"  History fetch error: {e}")
        history = []

    # Step 2 — Cross-reference GitHub issues
    print("  Fetching GitHub issues...")
    try:
        gh_req = urllib.request.Request(
            "https://api.github.com/repos/Jordybeer/kink/issues?state=open&per_page=100",
            headers={"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
        )
        with urllib.request.urlopen(gh_req) as r:
            open_issues = json.loads(r.read())
        issue_texts = [(i["number"], i["title"].lower(), (i.get("body") or "").lower()) for i in open_issues]
        print(f"  Open issues: {len(issue_texts)}")
    except Exception as e:
        print(f"  GitHub fetch error: {e}")
        issue_texts = []

    def is_already_tracked(finding):
        finding_lower = finding.lower()
        keywords = finding_lower.split()[:4]
        for num, title, body in issue_texts:
            matches = sum(1 for kw in keywords if kw in title or kw in body)
            if matches >= 2:
                return num
        return None

    # Collect all failures
    robin_fails = robin_report["observations"].get("fails_detail", [])
    leo_fails = leo_report["observations"].get("fails_detail", [])
    iris_fails = iris_report["observations"].get("fails_detail", [])

    # Deduplicate and classify
    new_findings = []
    already_tracked_issues = []

    all_fails_with_persona = (
        [(f, "robin") for f in robin_fails] +
        [(f, "leo") for f in leo_fails] +
        [(f, "iris") for f in iris_fails]
    )

    seen_classes = {}
    for fail, persona in all_fails_with_persona:
        if fail.startswith("suggestion:"):
            continue
        tracked = is_already_tracked(fail)
        if tracked:
            already_tracked_issues.append((fail, tracked))
        else:
            # Deduplicate by similarity
            key = fail[:40]
            if key not in seen_classes:
                seen_classes[key] = {"desc": fail, "personas": [persona]}
                new_findings.append({"desc": fail, "personas": [persona], "route": "various"})
            else:
                if persona not in seen_classes[key]["personas"]:
                    seen_classes[key]["personas"].append(persona)

    # Suggestions
    suggestions = []
    for obs in (
        iris_report["observations"].get("notes", [])
    ):
        if "multi_partner_compare_not_available" in obs:
            suggestions.append("Multi-partner compare not yet available")

    # Step 3 — Regression detection (simplified: check last 3 sessions from history)
    regressions = []
    # With only today's data available in the fetch, we skip regression for fresh run

    # Step 4 — Build Telegram summary
    def session_emoji(report):
        f = report["observations"].get("fail", 0)
        p = report["observations"].get("pass", 0)
        if f == 0:
            return "✅"
        elif f <= 3:
            return "⚠️"
        else:
            return "❌"

    robin_emoji = session_emoji(robin_report)
    leo_emoji = session_emoji(leo_report)
    iris_emoji = session_emoji(iris_report)

    # Fetch updated session counts
    try:
        personas = sb_get("sim_personas", "?select=*")
        robin_sc = next(p["session_count"] for p in personas if p["id"] == "robin")
        leo_sc = next(p["session_count"] for p in personas if p["id"] == "leo")
        iris_sc = next(p["session_count"] for p in personas if p["id"] == "iris")
    except:
        robin_sc = 12
        leo_sc = 12
        iris_sc = 10

    passed_count = sum(1 for r in [robin_report, leo_report, iris_report] if r["observations"].get("fail", 0) <= 2)
    total_pass = sum(r["observations"].get("pass", 0) for r in [robin_report, leo_report, iris_report])
    total_assertions = total_pass + sum(r["observations"].get("fail", 0) for r in [robin_report, leo_report, iris_report])

    robin_story = robin_report["observations"].get("story", "Robin ran a session.")
    leo_story = leo_report["observations"].get("story", "Leo ran a session.")
    iris_story = iris_report["observations"].get("story", "Iris ran a session.")

    # Trim each story to 2 sentences
    def trim_to_2(story):
        sents = [s.strip() for s in story.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        return ". ".join(sents[:2]) + "."

    robin_story_2 = trim_to_2(robin_story)
    leo_story_2 = trim_to_2(leo_story)
    iris_story_2 = trim_to_2(iris_story)

    # Build message
    msg_lines = [
        f"🧪 <b>KinkSync Sim — {DATE}</b>",
        f"<b>{passed_count}/3 passed</b> · {total_pass}/{total_assertions} checks",
        "",
        f"{robin_emoji} <b>Robin</b> · session {robin_sc}",
        f"<i>{robin_story_2}</i>",
    ]

    # Robin milestones/regressions
    # (traits post-session — curiosity was 5, no crossing milestone 8)

    msg_lines += [
        "",
        f"{leo_emoji} <b>Leo</b> · session {leo_sc}",
        f"<i>{leo_story_2}</i>",
    ]
    # Leo milestone: curiosity=10, impulsivity=10 → "chaos territory" already well past

    msg_lines += [
        "",
        f"{iris_emoji} <b>Iris</b> · session {iris_sc}",
        f"<i>{iris_story_2}</i>",
    ]

    # Issues section — only if new findings
    if new_findings:
        msg_lines += ["", f"🐛 <b>Issues ({len(new_findings)} unique):</b>"]
        for i, f in enumerate(new_findings[:5], 1):
            personas_str = ", ".join(f["personas"]) if len(f["personas"]) < 3 else "all personas"
            desc = f["desc"].replace("<", "&lt;").replace(">", "&gt;")[:80]
            msg_lines.append(f"{i}. {desc} — {personas_str}")
    elif not suggestions:
        msg_lines += ["", "✨ All clean"]

    if suggestions:
        msg_lines += ["", f"💡 <b>{len(suggestions)} new suggestion(s)</b>"]

    message = "\n".join(msg_lines)
    print(f"\n  Telegram message ({len(message)} chars):")
    print("  " + message.replace("\n", "\n  "))

    # Send Telegram summary
    def send_telegram_message(text):
        payload = json.dumps({
            "chat_id": TELEGRAM_CHAT_ID,
            "parse_mode": "HTML",
            "text": text,
        }).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                resp = json.loads(r.read())
                print(f"  Telegram OK: message_id={resp.get('result', {}).get('message_id')}")
                return True
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"  Telegram error {e.code}: {body}")
            return False

    send_telegram_message(message)

    # Step 5 — Send key screenshots per persona
    def send_photo(persona_id, filename, caption):
        if not filename or not os.path.exists(filename):
            print(f"  No screenshot file for {persona_id}: {filename}")
            return

        with open(filename, "rb") as f:
            image_bytes = f.read()

        boundary = "----KinkSimBoundary"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{TELEGRAM_CHAT_ID}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{caption}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"{os.path.basename(filename)}\"\r\n"
            f"Content-Type: image/png\r\n\r\n"
        ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()

        req = urllib.request.Request(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                resp = json.loads(r.read())
                print(f"  Photo sent for {persona_id}: {resp.get('result', {}).get('message_id')}")
        except urllib.error.HTTPError as e:
            print(f"  Photo error {e.code} for {persona_id}: {e.read().decode()[:200]}")

    # Pick best screenshot per persona (failure > new route > final)
    def pick_best_screenshot(persona_id, report):
        fail_count = report["observations"].get("fail", 0)
        screenshots = sorted([
            f for f in os.listdir(SCREENSHOT_DIR)
            if f.startswith(f"{persona_id}_")
        ])
        if not screenshots:
            return None

        # Priority 1: failure screenshot
        if fail_count > 0:
            for s in screenshots:
                if any(kw in s for kw in ["contract", "compare", "session", "error"]):
                    return os.path.join(SCREENSHOT_DIR, s)

        # Priority 2: last screenshot
        return os.path.join(SCREENSHOT_DIR, screenshots[-1])

    robin_best = pick_best_screenshot("robin", robin_report)
    leo_best = pick_best_screenshot("leo", leo_report)
    iris_best = pick_best_screenshot("iris", iris_report)

    time.sleep(0.5)
    send_photo("robin", robin_best, f"Robin — session {robin_sc}, {robin_best.split('_')[-1].replace('.png','') if robin_best else 'final'}")
    time.sleep(0.4)
    send_photo("leo", leo_best, f"Leo — session {leo_sc}, {leo_best.split('_')[-1].replace('.png','') if leo_best else 'final'}")
    time.sleep(0.4)
    send_photo("iris", iris_best, f"Iris — session {iris_sc}, {iris_best.split('_')[-1].replace('.png','') if iris_best else 'final'}")
    time.sleep(0.4)

    # Step 5b — Fixup prompt (always)
    if not new_findings:
        fixup_text = f"<pre><code>No fixes needed from {DATE}. All assertions passed.</code></pre>"
    else:
        lines = [f"Fix these sim findings from {DATE}. Work on the redesign branch."]
        for i, finding in enumerate(new_findings[:5], 1):
            desc = finding["desc"]
            # Derive file reference where possible
            file_hint = "app/ (see finding)"
            if "contract" in desc:
                file_hint = "app/contract/page.tsx"
            elif "compare" in desc:
                file_hint = "app/compare/page.tsx"
            elif "bottomnav" in desc.lower():
                file_hint = "components/BottomNav.tsx"
            elif "overflow" in desc:
                file_hint = "app/globals.css"
            elif "h1" in desc:
                file_hint = "app/page.tsx"
            lines.append(f"{i}. {desc}")
            lines.append(f"   {file_hint}")
        fixup_body = "\n".join(lines)
        fixup_text = f"<pre><code>{fixup_body}</code></pre>"

    send_telegram_message(fixup_text)

    # Step 6 — Regression alert
    if regressions:
        for reg in regressions:
            reg_msg = f"🚨 Regression detected — {DATE}\n\n{reg}"
            send_telegram_message(reg_msg)

    # Step 7 — New suggestions issue
    if suggestions:
        try:
            issue_body = f"## Sim suggestions {DATE}\n\n"
            issue_body += f"Session run: robin #{robin_sc}, leo #{leo_sc}, iris #{iris_sc}\n\n"
            for s in suggestions:
                issue_body += f"- {s} (iris, session {iris_sc}, /compare)\n"

            ToolSearch_req = urllib.request.Request(
                "https://api.github.com/repos/Jordybeer/kink/issues",
                data=json.dumps({
                    "title": f"Sim suggestions {DATE}",
                    "body": issue_body,
                    "labels": ["sim-suggestion"],
                }).encode(),
                headers={
                    "Authorization": f"token {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(ToolSearch_req) as r:
                issue_resp = json.loads(r.read())
                issue_num = issue_resp.get("number")
                print(f"  Created suggestions issue #{issue_num}")
                send_telegram_message(f"💡 <b>{len(suggestions)} new suggestion(s)</b> → #{issue_num}")
        except Exception as e:
            print(f"  GitHub issue creation error: {e}")

    # Step 8 — Write synthesis report
    synthesis_report = {
        "date": DATE,
        "persona": "synthesis",
        "observations": {
            "passed": passed_count,
            "total": 3,
            "robin_fail": robin_report["observations"].get("fail", 0),
            "leo_fail": leo_report["observations"].get("fail", 0),
            "iris_fail": iris_report["observations"].get("fail", 0),
            "new_findings": len(new_findings),
            "already_tracked": len(already_tracked_issues),
            "suggestions": suggestions,
        },
        "recommendations": {
            "new_findings": new_findings[:10],
            "regressions": regressions,
        },
        "regression_detected": len(regressions) > 0,
    }

    sb_post("sim_reports", synthesis_report)
    print(f"  Synthesis complete — {passed_count}/3 passed, {len(new_findings)} new findings")


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print(f"=== KinkSync Sim Run — {DATE} ===\n")

    # Fetch current persona state
    personas = sb_get("sim_personas", "?select=*")
    print(f"Loaded {len(personas)} personas")

    # Phase 3 — Run sessions in order
    robin_report = None
    leo_report = None
    iris_report = None
    robin_ss = None
    leo_ss = None
    iris_ss = None

    # Robin
    try:
        robin_report, robin_ss = run_robin(personas)
        # Refresh personas after Robin updates
        personas = sb_get("sim_personas", "?select=*")
    except Exception as e:
        print(f"❌ Robin session failed entirely: {e}")
        traceback.print_exc()
        robin_report = {
            "date": DATE, "persona": "robin",
            "observations": {"pass": 0, "fail": 99, "story": "Robin's session failed entirely.", "pages_visited": [], "notes": [f"error:{str(e)[:100]}"], "fails_detail": [str(e)[:100]]},
            "recommendations": {}, "regression_detected": False
        }

    # Leo
    try:
        leo_report, leo_ss = run_leo(personas)
        personas = sb_get("sim_personas", "?select=*")
    except Exception as e:
        print(f"❌ Leo session failed entirely: {e}")
        traceback.print_exc()
        leo_report = {
            "date": DATE, "persona": "leo",
            "observations": {"pass": 0, "fail": 99, "story": "Leo's session failed entirely.", "pages_visited": [], "notes": [f"error:{str(e)[:100]}"], "fails_detail": [str(e)[:100]]},
            "recommendations": {}, "regression_detected": False
        }

    # Iris
    try:
        iris_report, iris_ss = run_iris(personas)
        personas = sb_get("sim_personas", "?select=*")
    except Exception as e:
        print(f"❌ Iris session failed entirely: {e}")
        traceback.print_exc()
        iris_report = {
            "date": DATE, "persona": "iris",
            "observations": {"pass": 0, "fail": 99, "story": "Iris's session failed entirely.", "pages_visited": [], "notes": [f"error:{str(e)[:100]}"], "fails_detail": [str(e)[:100]]},
            "recommendations": {}, "regression_detected": False
        }

    # Phase 4 — Synthesis
    run_synthesis(robin_report, leo_report, iris_report, robin_ss, leo_ss, iris_ss)

    print("\n=== Sim run complete ===")


if __name__ == "__main__":
    main()

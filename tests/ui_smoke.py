# Browser smoke test. Needs: pip install playwright && playwright install chromium
# Run with the dev server up: python3 tests/ui_smoke.py
import os; os.makedirs("test-screenshots", exist_ok=True)
from playwright.sync_api import sync_playwright
import sys
import os
BASE=os.environ.get("TEST_BASE_URL","http://localhost:3000")
errors=[]; results=[]
def check(name, ok, extra=""):
    results.append((name, ok)); print(("PASS " if ok else "FAIL ")+name+(" - "+extra if extra else ""))

with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1440,"height":900}); pg=ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type=="error" and "font" not in m.text.lower() and "Failed to load resource" not in m.text else None)

    pg.goto(BASE+"/app?demo=true"); pg.wait_for_selector("[role=tablist]", timeout=30000)
    check("demo link logs in and opens workspace", "/app" in pg.url)
    tabs=pg.locator("[role=tab]"); check("9 workspace tabs render", tabs.count()==9, str(tabs.count()))

    # every tab renders without crashing
    for i in range(tabs.count()):
        label=tabs.nth(i).inner_text(); tabs.nth(i).click(); pg.wait_for_timeout(700)
        crashed = pg.locator("text=Application error").count()>0
        check(f"tab '{label}' renders", not crashed)
    # URL sync
    pg.locator("[role=tab]",has_text="Analytics").click(); pg.wait_for_timeout(300)
    check("tab is synced to URL", "tab=analytics" in pg.url, pg.url)

    # Receivables content
    pg.locator("[role=tab]",has_text="Receivables").click(); pg.wait_for_selector("text=Smart Collections Queue", timeout=10000)
    check("collections queue shows Verve first", pg.locator("li:has-text('Verve')").first.is_visible())
    check("late fee column present", pg.locator("text=Accrued late fees").count()>0)
    pg.screenshot(path="test-screenshots/receivables.png", full_page=True)

    # Analytics chart + concentration
    pg.locator("[role=tab]",has_text="Analytics").click(); pg.wait_for_selector("text=Monthly Profit and Loss", timeout=10000); pg.wait_for_timeout(1200)
    check("analytics chart renders svg", pg.locator(".recharts-wrapper svg").count()>0)
    check("CA report pack links present", pg.locator("a[href*='/api/reports']").count()>=3)
    pg.screenshot(path="test-screenshots/analytics.png", full_page=True)

    # Recurring: create a schedule through the UI
    pg.locator("[role=tab]",has_text="Recurring").click(); pg.wait_for_selector("text=Recurring Invoices", timeout=10000)
    pg.fill("input[placeholder^='Description']","UI test retainer"); pg.fill("input[placeholder^='Amount']","20000")
    pg.click("text=Create schedule"); pg.wait_for_selector("text=UI test retainer", timeout=10000)
    check("recurring schedule created via UI", True)
    pg.screenshot(path="test-screenshots/recurring.png", full_page=True)

    # Activity shows it
    pg.locator("[role=tab]",has_text="Activity").click(); pg.wait_for_selector("text=Activity Log", timeout=10000); pg.wait_for_timeout(600)
    check("activity log records the schedule", pg.locator("text=Created monthly schedule").count()>0)

    # Client Intel
    pg.locator("text=Verve Commerce").first.click(); pg.locator("[role=tab]",has_text="Client Intel").click()
    pg.wait_for_selector("text=Commitments and Promises", timeout=10000); pg.wait_for_timeout(800)
    check("client intel lists promises with status badges", pg.locator("text=BROKEN").count()+pg.locator("text=broken").count()>0)
    pg.screenshot(path="test-screenshots/intel.png", full_page=True)

    # Alerts bell
    pg.locator("button[aria-label^='Alerts']").click(); pg.wait_for_selector("[role=menu]", timeout=5000)
    check("alerts bell lists alerts", pg.locator("[role=menu] li").count()>0, str(pg.locator("[role=menu] li").count()))
    pg.screenshot(path="test-screenshots/alerts.png")
    pg.locator("[role=menu] li").first.click(); pg.wait_for_timeout(600)
    check("clicking an alert navigates to a tab", "tab=" in pg.url, pg.url)

    # Keyboard shortcuts
    pg.locator("body").click(position={"x":5,"y":5}); pg.keyboard.press("Alt+1"); pg.wait_for_timeout(300)
    check("Alt+1 jumps to Command & Ledger", "tab=ledger" in pg.url, pg.url)
    pg.keyboard.press("?"); pg.wait_for_selector("text=Keyboard shortcuts", timeout=3000); check("? opens shortcuts help", True)
    pg.keyboard.press("Escape")

    # Settings page + GSTIN validation
    pg.goto(BASE+"/settings"); pg.wait_for_selector("text=Business Profile", timeout=15000); pg.wait_for_selector("input", timeout=10000)
    check("settings shows valid demo GSTIN", pg.locator("text=Valid GSTIN").count()>0)
    g=pg.locator("label:has-text('GSTIN') input"); g.fill("37AABCT1234F1Z5"); pg.wait_for_timeout(200)
    check("invalid GSTIN is flagged live", pg.locator("text=check digit").count()>0)
    pg.screenshot(path="test-screenshots/settings.png", full_page=True)
    pg.click("text=Save changes"); pg.wait_for_selector("[role=status]", timeout=5000)
    check("saving an invalid GSTIN is rejected", pg.locator("[role=status]").inner_text().lower().find("gstin")>=0)

    # Logout protects pages
    ctx2=b.new_context(); pg2=ctx2.new_page(); pg2.goto(BASE+"/app"); pg2.wait_for_load_state()
    check("anonymous visitor is sent to /login", "/login" in pg2.url, pg2.url)

    # mobile layout: tab bar scrolls, no horizontal page overflow
    m=b.new_context(viewport={"width":390,"height":844}); pm=m.new_page(); pm.goto(BASE+"/app?demo=true"); pm.wait_for_selector("[role=tablist]", timeout=30000)
    overflow=pm.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check("no horizontal page overflow on mobile", overflow<=1, f"overflow={overflow}px")
    pm.screenshot(path="test-screenshots/mobile.png")
    b.close()

print("\nJS errors:", errors[:8] if errors else "none")
print(f"\n{sum(1 for _,ok in results if ok)}/{len(results)} checks passed")
sys.exit(0 if all(ok for _,ok in results) else 1)

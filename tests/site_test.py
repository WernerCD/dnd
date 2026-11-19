"""Hub-specific smoke tests (run by tools/smoke_test.py): the search box."""


def run(page, base, check):
    page.goto(base, wait_until="load"); page.wait_for_timeout(500)
    box = page.locator("#hubSearch")
    check(box.count() == 1, "[hub search] search box is on the hub")
    box.click(); box.fill("party"); page.wait_for_timeout(1500)
    check(page.locator("#hubResults li[role=option]").count() >= 1, "[hub search] typing 'party' lists the Party page")
    box.press("ArrowDown")
    check(page.locator("#hubResults li[aria-selected=true]").count() == 1, "[hub search] arrow keys select a result")
    box.press("Escape")
    check(page.locator("#hubResults").is_hidden(), "[hub search] Escape clears the results")
    page.keyboard.press("/")
    check(page.evaluate("document.activeElement.id") == "hubSearch", "[hub search] / focuses the box")

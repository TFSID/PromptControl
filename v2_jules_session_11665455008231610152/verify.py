from playwright.sync_api import sync_playwright

def verify_feature(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)
    
    # Check if the Builder is rendered by looking for some text
    # The default page for create-next-app is still there because we didn't update app/page.tsx
    # Let's check if the builder component was injected into page.tsx yet.
    page.screenshot(path="verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="video")
        page = context.new_page()
        try:
            verify_feature(page)
        finally:
            context.close()
            browser.close()

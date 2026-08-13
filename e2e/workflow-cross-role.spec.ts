// Workflow 18: Messaging & Notifications (shared component)
// Workflow 19: PayOS Payment — chỉ điều hướng/đọc dữ liệu có sẵn, KHÔNG thực hiện thanh toán thật.
// Workflow 20 (Live Video Session/Agora) và 21 (tạo dispute mới) không tự động hoá ở đây:
//   - Workflow 20 cần 2 người tham gia thật cùng lúc + camera/mic thật, rủi ro flaky rất cao.
//   - Workflow 21 (tạo dispute) sẽ ghi dữ liệu thật vào hệ thống nếu submit — không an toàn để tự động chạy lặp lại.
import { test, expect, type Page } from '@playwright/test';
import { loginAs, hasCredentials } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Cross-role: Messaging & Payment', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.skip(!hasCredentials('parent'), 'Thiếu E2E_PARENT_EMAIL / E2E_TEST_PASSWORD');
    page = await (await browser.newContext()).newPage();
    await loginAs(page, 'parent');
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Workflow 18: Mở 1 cuộc trò chuyện có sẵn và xem tin nhắn', async () => {
    await page.goto('/parent-portal/messages');
    const firstConversation = page.locator('button[aria-label^="Mở cuộc trò chuyện"]').first();
    const appeared = await firstConversation
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!appeared, 'Không có cuộc trò chuyện nào trong tài khoản test');

    await firstConversation.click();
    await page.waitForLoadState('networkidle');
    // Panel chat bên phải phải không còn ở trạng thái rỗng "Tin nhắn của bạn"
    await expect(page.getByRole('heading', { name: 'Tin nhắn của bạn' })).not.toBeVisible();
  });

  test('Workflow 19: Mở 1 booking có sẵn và xem trang chi tiết/thanh toán (chỉ đọc)', async () => {
    await page.goto('/parent-portal/booking');
    await page.waitForLoadState('networkidle');
    const viewDetailButton = page.getByRole('button', { name: 'Xem chi tiết' }).first();
    const count = await viewDetailButton.count();
    test.skip(count === 0, 'Tài khoản test chưa có booking nào');

    await viewDetailButton.click();
    await page.waitForURL(/\/parent-portal\/booking\//, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    const payButton = page.getByRole('button', { name: /Thanh toán/ });
    if (await payButton.count() > 0) {
      await payButton.first().click();
      await page.waitForURL(/\/payment/, { timeout: 10_000 });
      await page.waitForLoadState('networkidle');
      // Chỉ xác nhận trang thanh toán mở ra — KHÔNG bấm quét QR / xác nhận thanh toán thật.
      await expect(page).toHaveURL(/\/payment/);
    }
  });
});

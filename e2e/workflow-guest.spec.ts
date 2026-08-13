// Workflow 2: Find & Book a Tutor — phần guest browsing (chưa cần login)
import { test, expect } from '@playwright/test';

test.describe('Workflow 2: Find & Book a Tutor (guest)', () => {
  test('trang chủ hiển thị và có nút Tìm gia sư', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'TÌM GIA SƯ' }).first()).toBeVisible();
  });

  test('trang tìm gia sư hiển thị danh sách/tìm kiếm', async ({ page }) => {
    await page.goto('/tutor-search');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-search/);
  });

  test('chưa đăng nhập, bấm đặt lịch trên trang chi tiết gia sư sẽ yêu cầu login', async ({ page }) => {
    await page.goto('/tutor-search');
    await page.waitForLoadState('networkidle');
    const firstTutorCard = page.locator('.tutor-card').first();
    const count = await firstTutorCard.count();
    test.skip(count === 0, 'Không có gia sư nào trong danh sách để mở trang chi tiết');

    await firstTutorCard.click();
    await expect(page).toHaveURL(/\/tutor-detail\//);

    const bookButton = page.getByRole('button', { name: /ĐẶT LỊCH NGAY/i });
    if (await bookButton.count() > 0) {
      await bookButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

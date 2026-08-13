// Workflow 3-7: Parent Portal — smoke test cho các trang tĩnh/list (không thao tác phá huỷ dữ liệu)
// Login 1 lần duy nhất và tái sử dụng session cho cả nhóm test — backend giới hạn 10 login/phút/IP.
import { test, expect, type Page } from '@playwright/test';
import { loginAs, hasCredentials } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Parent Portal', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.skip(!hasCredentials('parent'), 'Thiếu E2E_PARENT_EMAIL / E2E_TEST_PASSWORD');
    page = await (await browser.newContext()).newPage();
    await loginAs(page, 'parent');
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Workflow 3: Dashboard hiển thị lời chào', async () => {
    await page.goto('/parent-portal/dashboard');
    await expect(page.getByText(/Xin chào,/)).toBeVisible();
  });

  test('Workflow 3: Quản lý con hiển thị danh sách/nút thêm con', async () => {
    await page.goto('/parent-portal/student');
    await expect(page.getByRole('heading', { name: 'Quản lý con' })).toBeVisible();
  });

  test('Workflow 4: Danh sách đặt lịch hiển thị', async () => {
    await page.goto('/parent-portal/booking');
    await expect(page.getByRole('heading', { name: 'Đặt lịch' })).toBeVisible();
  });

  test('Workflow 5: Danh sách buổi học hiển thị', async () => {
    await page.goto('/parent-portal/lessons');
    await expect(page.getByRole('heading', { name: 'Buổi học' })).toBeVisible();
  });

  test('Workflow 6: Trang ví hiển thị', async () => {
    await page.goto('/parent-portal/wallet');
    await expect(page.getByRole('heading', { name: 'Tài chính của tôi' })).toBeVisible();
  });

  test('Workflow 6: Trang khiếu nại hiển thị', async () => {
    await page.goto('/parent-portal/disputes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/parent-portal\/disputes/);
  });

  test('Workflow 7: Trang tin nhắn hiển thị', async () => {
    await page.goto('/parent-portal/messages');
    await expect(page.getByRole('heading', { name: 'Tin nhắn', level: 1 })).toBeVisible();
  });

  test('Workflow 7: Trang thông báo hiển thị', async () => {
    await page.goto('/parent-portal/notifications');
    await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();
  });

  test('Workflow 7: Trang tài khoản hiển thị', async () => {
    await page.goto('/parent-portal/account');
    await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  });
});

// Workflow 8-11: Student Portal — smoke test cho các trang tĩnh/list
// Login 1 lần duy nhất và tái sử dụng session cho cả nhóm test — backend giới hạn 10 login/phút/IP.
import { test, expect, type Page } from '@playwright/test';
import { loginAs, hasCredentials } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Student Portal', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.skip(!hasCredentials('student'), 'Thiếu E2E_STUDENT_EMAIL / E2E_TEST_PASSWORD');
    page = await (await browser.newContext()).newPage();
    await loginAs(page, 'student');
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Workflow 8: Dashboard hoặc trang hồ sơ bắt buộc hiển thị', async () => {
    // Nếu hồ sơ chưa hoàn tất, hệ thống redirect sang /student-portal/profile trước.
    await page.waitForURL(/\/student-portal\/(dashboard|profile)/, { timeout: 10_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('Workflow 9: Trang đặt lịch của học sinh hiển thị', async () => {
    await page.goto('/student-portal/booking');
    await expect(page.getByRole('heading', { name: 'Đặt lịch' })).toBeVisible();
  });

  test('Workflow 9: Trang lịch học hiển thị', async () => {
    await page.goto('/student-portal/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student-portal\/calendar/);
  });

  test('Workflow 10: Trang ví học sinh hiển thị', async () => {
    await page.goto('/student-portal/wallet');
    await expect(page.getByRole('heading', { name: 'Ví của tôi' })).toBeVisible();
  });

  test('Workflow 10: Trang khiếu nại học sinh hiển thị', async () => {
    await page.goto('/student-portal/disputes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student-portal\/disputes/);
  });

  test('Workflow 10: Trang tin nhắn học sinh hiển thị', async () => {
    await page.goto('/student-portal/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student-portal\/messages/);
  });

  test('Workflow 11: Trang tài khoản học sinh hiển thị', async () => {
    await page.goto('/student-portal/account');
    await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  });

  test('Workflow 11: Trang thông báo học sinh hiển thị', async () => {
    await page.goto('/student-portal/notifications');
    await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();
  });
});

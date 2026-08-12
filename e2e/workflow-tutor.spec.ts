// Workflow 12-17: Tutor Portal — smoke test cho các trang tĩnh/list
// Login 1 lần duy nhất và tái sử dụng session cho cả nhóm test — backend giới hạn 10 login/phút/IP.
import { test, expect, type Page } from '@playwright/test';
import { loginAs, hasCredentials } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Tutor Portal', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.skip(!hasCredentials('tutor'), 'Thiếu E2E_TUTOR_PHONE / E2E_TEST_PASSWORD');
    page = await (await browser.newContext()).newPage();
    await loginAs(page, 'tutor');
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Workflow 12: Dashboard hiển thị Bảng điều khiển', async () => {
    await page.goto('/tutor-portal/dashboard');
    await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
  });

  test('Workflow 13: Trang hồ sơ công khai hiển thị', async () => {
    await page.goto('/tutor-portal/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/profile/);
  });

  test('Workflow 14: Trang yêu cầu đặt lịch hiển thị', async () => {
    await page.goto('/tutor-portal/bookings');
    await expect(page.getByRole('heading', { name: 'Yêu cầu đặt lịch' })).toBeVisible();
  });

  test('Workflow 14: Trang lịch giảng dạy hiển thị', async () => {
    await page.goto('/tutor-portal/calendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/calendar/);
  });

  test('Workflow 16: Trang tài chính hiển thị', async () => {
    await page.goto('/tutor-portal/finance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/finance$/);
  });

  test('Workflow 16: Lịch sử giao dịch hiển thị', async () => {
    await page.goto('/tutor-portal/finance/transactions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/finance\/transactions/);
  });

  test('Workflow 16: Thông tin ngân hàng hiển thị', async () => {
    await page.goto('/tutor-portal/finance/bank-info');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/finance\/bank-info/);
  });

  test('Workflow 16: Form tạo yêu cầu rút tiền hiển thị (không submit)', async () => {
    await page.goto('/tutor-portal/finance/withdraw');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/finance\/withdraw/);
  });

  test('Workflow 16: Danh sách yêu cầu rút tiền hiển thị', async () => {
    await page.goto('/tutor-portal/finance/withdrawals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/finance\/withdrawals/);
  });

  test('Workflow 17: Trang khiếu nại hiển thị', async () => {
    await page.goto('/tutor-portal/disputes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/tutor-portal\/disputes/);
  });

  test('Workflow 17: Trang tin nhắn hiển thị', async () => {
    await page.goto('/tutor-portal/messages');
    await expect(page.getByRole('heading', { name: 'Tin nhắn', level: 1 })).toBeVisible();
  });

  test('Workflow 17: Trang tài khoản hiển thị', async () => {
    await page.goto('/tutor-portal/account');
    await expect(page.getByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
  });
});

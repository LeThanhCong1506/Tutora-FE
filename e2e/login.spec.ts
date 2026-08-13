import { test, expect } from '@playwright/test';

test.describe('Đăng nhập', () => {
  test('hiển thị lỗi khi bỏ trống thông tin', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(
      page.getByText('Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu!'),
    ).toBeVisible();
  });

  test('báo lỗi khi email không hợp lệ', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill('not-an-email@');
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('somepassword');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page.getByText('Email không hợp lệ!')).toBeVisible();
  });

  test('parent đăng nhập thành công vào dashboard', async ({ page }) => {
    const email = process.env.E2E_PARENT_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, 'Cần E2E_PARENT_EMAIL / E2E_TEST_PASSWORD để chạy test này');

    await page.goto('/login');
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(email!);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password!);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/\/parent-portal\/dashboard/, { timeout: 10_000 });
  });

  test('tutor đăng nhập thành công vào dashboard', async ({ page }) => {
    const phone = process.env.E2E_TUTOR_PHONE;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!phone || !password, 'Cần E2E_TUTOR_PHONE / E2E_TEST_PASSWORD để chạy test này');

    await page.goto('/login');
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(phone!);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password!);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(/\/tutor-portal\/dashboard/, { timeout: 10_000 });
  });
});

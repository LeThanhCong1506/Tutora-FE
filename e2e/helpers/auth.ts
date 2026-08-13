import type { Page } from '@playwright/test';

export type Role = 'parent' | 'student' | 'tutor';

const CREDENTIALS: Record<Role, { identifier: string | undefined; urlPattern: RegExp }> = {
  parent: { identifier: process.env.E2E_PARENT_EMAIL, urlPattern: /\/parent-portal\/dashboard/ },
  student: { identifier: process.env.E2E_STUDENT_EMAIL, urlPattern: /\/student-portal\// },
  tutor: { identifier: process.env.E2E_TUTOR_PHONE, urlPattern: /\/tutor-portal\/dashboard/ },
};

export const hasCredentials = (role: Role): boolean =>
  Boolean(CREDENTIALS[role].identifier && process.env.E2E_TEST_PASSWORD);

/** Đăng nhập bằng tài khoản thật, trả về false nếu thiếu credential (caller nên skip). */
export const loginAs = async (page: Page, role: Role): Promise<boolean> => {
  const { identifier, urlPattern } = CREDENTIALS[role];
  const password = process.env.E2E_TEST_PASSWORD;
  if (!identifier || !password) return false;

  await page.goto('/login');
  await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(identifier);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  try {
    await page.waitForURL(urlPattern, { timeout: 15_000 });
  } catch {
    // Dev server đôi khi phản hồi chậm khi chạy nhiều test liên tục — thử lại 1 lần.
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(urlPattern, { timeout: 15_000 });
  }
  await page.waitForLoadState('networkidle');
  return true;
};

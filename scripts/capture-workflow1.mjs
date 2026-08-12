// Chụp ảnh màn hình cho Report 6 - User Manual - Workflow 1: Registration & Login
// Chạy: node scripts/capture-workflow1.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local — các bước cần login thật sẽ bị bỏ qua
}

const OUT_DIR = path.resolve('docs/screenshots/workflow1');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const shot = async (page, name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
};

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Register Screen (trống)
  await page.goto(`${BASE_URL}/register`);
  await page.waitForLoadState('networkidle');
  await shot(page, '01-register-screen');

  // 2. Register Screen - Role Selection (điền form mẫu + chọn vai trò)
  await page.getByLabel('Họ và Tên').fill('Nguyễn Văn Demo');
  await page.getByLabel('Số Điện Thoại').fill('0909000000');
  await page.locator('#email').fill('demo@example.com');
  await page.getByRole('textbox', { name: 'Mật Khẩu', exact: true }).fill('Demo@12345');
  await page.getByLabel('Nhập lại Mật Khẩu').fill('Demo@12345');
  await page.getByText('Học sinh').click();
  await shot(page, '02-register-role-selection');

  // 3. Verify Phone Screen
  await page.goto(`${BASE_URL}/verify-phone?phone=0909000000`);
  await page.waitForLoadState('networkidle');
  await shot(page, '03-verify-phone-screen');

  // 4. Login Screen (trống)
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await shot(page, '04-login-screen');

  // 5. Forgot Password Modal
  await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
  await page.waitForTimeout(300);
  await shot(page, '05-forgot-password-modal');
  await page.keyboard.press('Escape');

  // 6. Role Dashboard — Parent
  const parentEmail = process.env.E2E_PARENT_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (parentEmail && password) {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(parentEmail);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(/\/parent-portal\/dashboard/, { timeout: 10_000 });
    await page.getByRole('heading', { name: /Xin chào/ }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500); // đợi ảnh/số liệu bên trong thẻ render nốt
    await shot(page, '06-role-dashboard-parent');
  } else {
    console.warn('Bỏ qua dashboard Parent — thiếu E2E_PARENT_EMAIL / E2E_TEST_PASSWORD trong .env.local');
  }

  // 7. Role Dashboard — Student
  const studentEmail = process.env.E2E_STUDENT_EMAIL;
  if (studentEmail && password) {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(studentEmail);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(/\/student-portal\//, { timeout: 10_000 });
    await page.getByRole('heading', { name: /Xin chào/ }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500);
    await shot(page, '07-role-dashboard-student');
  } else {
    console.warn('Bỏ qua dashboard Student — thiếu E2E_STUDENT_EMAIL / E2E_TEST_PASSWORD trong .env.local');
  }

  // 8. Role Dashboard — Tutor
  const tutorPhone = process.env.E2E_TUTOR_PHONE;
  if (tutorPhone && password) {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(tutorPhone);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(/\/tutor-portal\/dashboard/, { timeout: 10_000 });
    await page.getByRole('heading', { name: 'Bảng điều khiển' }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500);
    await shot(page, '08-role-dashboard-tutor');
  } else {
    console.warn('Bỏ qua dashboard Tutor — thiếu E2E_TUTOR_PHONE / E2E_TEST_PASSWORD trong .env.local');
  }

  await browser.close();
  console.log('\nHoàn tất. Bỏ qua "Social Register Screen" (/auth/social-complete) vì cần đăng nhập Google thật — trang này redirect về /login nếu không có session hợp lệ.');
};

run();

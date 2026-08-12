// Chụp ảnh màn hình cho Report 6 - User Manual - Workflow 1-21
// Chạy: node scripts/capture-workflows.mjs
// Chỉ điều hướng + chụp ảnh trang có sẵn — KHÔNG submit form phá huỷ dữ liệu (dispute, thanh toán thật, rút tiền thật...).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local không tồn tại — các bước cần login sẽ tự bỏ qua
}

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const OUT_ROOT = path.resolve('docs/screenshots');

const skipped = [];

const shot = async (page, workflowDir, name) => {
  const dir = path.join(OUT_ROOT, workflowDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', path.relative(OUT_ROOT, file));
};

const goto = async (page, workflowDir, name, url, opts = {}) => {
  try {
    await page.goto(url, { timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    if (opts.wait) await page.waitForTimeout(opts.wait);
    await shot(page, workflowDir, name);
    return true;
  } catch (err) {
    console.warn(`Bỏ qua ${workflowDir}/${name} (${url}): ${err.message.split('\n')[0]}`);
    skipped.push(`${workflowDir}/${name}`);
    return false;
  }
};

const login = async (page, identifier, password, urlPattern) => {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(identifier);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL(urlPattern, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
};

const run = async () => {
  const browser = await chromium.launch();
  const password = process.env.E2E_TEST_PASSWORD;

  // ===== Workflow 2: Find & Book a Tutor (guest) =====
  {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await goto(page, 'workflow2-find-book', '01-home', `${BASE_URL}/`);
    await goto(page, 'workflow2-find-book', '02-tutor-search', `${BASE_URL}/tutor-search`, { wait: 1500 });

    const firstTutorLink = page.locator('.tutor-card').first();
    if (await firstTutorLink.count() > 0) {
      await firstTutorLink.click();
      await page.waitForURL(/\/tutor-detail\//, { timeout: 10_000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      await shot(page, 'workflow2-find-book', '03-tutor-detail');
    } else {
      skipped.push('workflow2-find-book/03-tutor-detail (không có gia sư trong danh sách)');
    }
    await page.close();
  }

  // ===== Workflow 3-7: Parent Portal =====
  if (process.env.E2E_PARENT_EMAIL && password) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await login(page, process.env.E2E_PARENT_EMAIL, password, /\/parent-portal\/dashboard/);
    await page.waitForTimeout(1500);
    await shot(page, 'workflow3-parent-dashboard', '01-dashboard');
    await goto(page, 'workflow3-parent-dashboard', '02-manage-students', `${BASE_URL}/parent-portal/student`);
    await goto(page, 'workflow4-parent-booking', '01-booking-list', `${BASE_URL}/parent-portal/booking`, { wait: 800 });
    await goto(page, 'workflow5-parent-lessons', '01-lessons-list', `${BASE_URL}/parent-portal/lessons`, { wait: 800 });
    await goto(page, 'workflow6-parent-wallet', '01-wallet', `${BASE_URL}/parent-portal/wallet`, { wait: 800 });
    await goto(page, 'workflow6-parent-wallet', '02-disputes-list', `${BASE_URL}/parent-portal/disputes`, { wait: 800 });
    await goto(page, 'workflow7-parent-account', '01-messages', `${BASE_URL}/parent-portal/messages`, { wait: 1200 });
    await goto(page, 'workflow7-parent-account', '02-notifications', `${BASE_URL}/parent-portal/notifications`, { wait: 800 });
    await goto(page, 'workflow7-parent-account', '03-account', `${BASE_URL}/parent-portal/account`);
    await page.close();
  } else {
    skipped.push('Parent Portal (thiếu E2E_PARENT_EMAIL/E2E_TEST_PASSWORD)');
  }

  // ===== Workflow 8-11: Student Portal =====
  if (process.env.E2E_STUDENT_EMAIL && password) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await login(page, process.env.E2E_STUDENT_EMAIL, password, /\/student-portal\//);
    await page.waitForTimeout(1500);
    await shot(page, 'workflow8-student-dashboard', '01-dashboard-or-profile');
    await goto(page, 'workflow9-student-booking', '01-booking', `${BASE_URL}/student-portal/booking`, { wait: 800 });
    await goto(page, 'workflow9-student-booking', '02-calendar', `${BASE_URL}/student-portal/calendar`, { wait: 800 });
    await goto(page, 'workflow10-student-wallet', '01-wallet', `${BASE_URL}/student-portal/wallet`, { wait: 800 });
    await goto(page, 'workflow10-student-wallet', '02-disputes', `${BASE_URL}/student-portal/disputes`, { wait: 800 });
    await goto(page, 'workflow10-student-wallet', '03-messages', `${BASE_URL}/student-portal/messages`, { wait: 1200 });
    await goto(page, 'workflow11-student-account', '01-account', `${BASE_URL}/student-portal/account`);
    await goto(page, 'workflow11-student-account', '02-notifications', `${BASE_URL}/student-portal/notifications`, { wait: 800 });
    await page.close();
  } else {
    skipped.push('Student Portal (thiếu E2E_STUDENT_EMAIL/E2E_TEST_PASSWORD)');
  }

  // ===== Workflow 12-17: Tutor Portal =====
  if (process.env.E2E_TUTOR_PHONE && password) {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await login(page, process.env.E2E_TUTOR_PHONE, password, /\/tutor-portal\/dashboard/);
    await page.waitForTimeout(1500);
    await shot(page, 'workflow12-tutor-onboarding', '01-dashboard');
    await goto(page, 'workflow13-tutor-profile', '01-profile', `${BASE_URL}/tutor-portal/profile`, { wait: 1000 });
    await goto(page, 'workflow14-tutor-bookings', '01-bookings', `${BASE_URL}/tutor-portal/bookings`, { wait: 800 });
    await goto(page, 'workflow14-tutor-bookings', '02-calendar', `${BASE_URL}/tutor-portal/calendar`, { wait: 800 });
    await goto(page, 'workflow16-tutor-finance', '01-finance-dashboard', `${BASE_URL}/tutor-portal/finance`, { wait: 800 });
    await goto(page, 'workflow16-tutor-finance', '02-transactions', `${BASE_URL}/tutor-portal/finance/transactions`, { wait: 800 });
    await goto(page, 'workflow16-tutor-finance', '03-bank-info', `${BASE_URL}/tutor-portal/finance/bank-info`, { wait: 800 });
    await goto(page, 'workflow16-tutor-finance', '04-withdraw-form', `${BASE_URL}/tutor-portal/finance/withdraw`, { wait: 800 });
    await goto(page, 'workflow16-tutor-finance', '05-withdrawals-list', `${BASE_URL}/tutor-portal/finance/withdrawals`, { wait: 800 });
    await goto(page, 'workflow17-tutor-account', '01-disputes', `${BASE_URL}/tutor-portal/disputes`, { wait: 800 });
    await goto(page, 'workflow17-tutor-account', '02-messages', `${BASE_URL}/tutor-portal/messages`, { wait: 1200 });
    await goto(page, 'workflow17-tutor-account', '03-account', `${BASE_URL}/tutor-portal/account`);
    await page.close();
  } else {
    skipped.push('Tutor Portal (thiếu E2E_TUTOR_PHONE/E2E_TEST_PASSWORD)');
  }

  await browser.close();

  console.log('\n=== Hoàn tất ===');
  if (skipped.length) {
    console.log('Đã bỏ qua (thiếu data/credential hoặc route không tồn tại lúc chụp):');
    skipped.forEach((s) => console.log(' -', s));
  }
  console.log('\nKhông tự động hoá (theo quyết định đã thống nhất):');
  console.log(' - Workflow 1 (đã có script riêng: scripts/capture-workflow1.mjs)');
  console.log(' - Workflow 18 phần gửi tin nhắn thật / booking-context card tương tác — chỉ chụp trạng thái đọc');
  console.log(' - Workflow 19 phần quét QR & xác nhận thanh toán thật (PayOS)');
  console.log(' - Workflow 20 (Live Video Session/Agora) — cần 2 người tham gia thật + camera/mic');
  console.log(' - Workflow 21 phần tạo dispute thật (sẽ ghi dữ liệu thật vào hệ thống)');
  console.log(' - Workflow 22-29 (Admin/Staff Portal) — nằm ở repo tutora-admin-frontend riêng, chưa có trong repo này');
};

run();

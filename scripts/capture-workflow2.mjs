// Chụp ảnh màn hình cho Report 6 - User Manual - Workflow 2: Find & Book a Tutor
// Chạy: node scripts/capture-workflow2.mjs
// Chỉ điều hướng + tương tác đọc dữ liệu có sẵn — KHÔNG bấm "GỬI YÊU CẦU" (sẽ tạo booking request thật).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local không tồn tại — các bước cần login thật sẽ bị bỏ qua
}

const OUT_DIR = path.resolve('docs/screenshots/workflow2');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

const shot = async (page, name) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
};

// Nút "Đặt lịch ngay" chỉ render sau khi dữ liệu lịch rảnh của gia sư tải xong —
// dùng waitFor thay vì count() (count() không tự retry, dễ bắt trúng lúc DOM chưa kịp render).
const waitVisible = async (locator, timeout = 8_000) =>
  locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Home Page
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  await shot(page, '01-home-page');

  // 2. Tutor Search Screen
  await page.getByRole('link', { name: 'TÌM GIA SƯ' }).first().click();
  await page.waitForURL(/\/tutor-search/, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await shot(page, '02-tutor-search-screen');

  // 3. Tutor Detail Screen
  const firstTutorCard = page.locator('.tutor-card').first();
  if (!(await waitVisible(firstTutorCard))) {
    console.warn('Không có gia sư nào trong danh sách — bỏ qua phần còn lại của Workflow 2.');
    await browser.close();
    return;
  }
  await firstTutorCard.click();
  await page.waitForURL(/\/tutor-detail\//, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');

  const bookNowButton = page.getByRole('button', { name: /ĐẶT LỊCH NGAY/i });
  // Đợi hẳn nút thật (phụ thuộc lịch rảnh gia sư tải xong) trước khi chụp — tránh chụp
  // đúng lúc trang còn placeholder rồi lỡ bấm hụt ở bước sau.
  await waitVisible(bookNowButton, 10_000);
  await shot(page, '03-tutor-detail-screen');
  const tutorUrl = page.url();

  // 4. Login Prompt (chưa đăng nhập, bấm "Đặt lịch ngay")
  if (await waitVisible(bookNowButton)) {
    await bookNowButton.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400); // đợi toast "Vui lòng đăng nhập..." render
    await shot(page, '04-login-prompt');
  } else {
    console.warn('Không thấy nút "Đặt lịch ngay" — bỏ qua Login Prompt.');
  }

  // 5-8. Booking Modal Step 1-4 (cần đăng nhập parent + quay lại trang tutor-detail)
  const parentEmail = process.env.E2E_PARENT_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (parentEmail && password) {
    await page.getByLabel('Số điện thoại, email hoặc tên đăng nhập').fill(parentEmail);
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(/\/parent-portal\/dashboard/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    await page.goto(tutorUrl);
    // Xoá draft booking cũ (sessionStorage: draft_booking_<parentId>_<tutorId>) để modal
    // luôn mở lại từ Bước 1 thay vì resume dở dang từ lần chạy script trước.
    await page.evaluate(() => {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('draft_booking_'))
        .forEach((k) => sessionStorage.removeItem(k));
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const bookNowButtonLoggedIn = page.getByRole('button', { name: /ĐẶT LỊCH NGAY/i });
    await waitVisible(bookNowButtonLoggedIn, 10_000);
    await bookNowButtonLoggedIn.click();
    const modal = page.locator('.ant-modal, [role="dialog"]').first();
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
    await page.waitForTimeout(400);

    // Bước 1/4: chọn môn học + học sinh (selector theo class CSS Module, không dựa vào text
    // "Lớp N" vì chuỗi đó xuất hiện cả trong thẻ môn học lẫn thẻ học sinh).
    const subjectCard = modal.locator('[class*="subjectCard"]').first();
    const childCard = modal.locator('[class*="childCard"]').first();
    if ((await subjectCard.count()) > 0) await subjectCard.click();
    if ((await childCard.count()) > 0) await childCard.click();
    await page.waitForTimeout(300);
    await shot(page, '05-booking-modal-step1');

    const nextButton = modal.getByRole('button', { name: 'Tiếp theo' });
    if ((await nextButton.count()) > 0 && (await nextButton.isEnabled())) {
      // Bước 2/4: cách đặt lịch
      await nextButton.click();
      await page.waitForTimeout(400);
      await shot(page, '06-booking-modal-step2');

      // Bước 3/4: chọn khung giờ
      await modal.getByRole('button', { name: 'Tiếp theo' }).click();
      await page.waitForTimeout(400);
      // Chỉ những slot còn trống mới có nhãn "+ Chọn" — slot đã kín hiển thị "—" và bị disabled.
      const firstSlot = modal.getByText('+ Chọn', { exact: true }).first();
      if ((await firstSlot.count()) > 0) await firstSlot.click();
      await page.waitForTimeout(300);
      await shot(page, '07-booking-modal-step3');

      // Bước 4/4: xác nhận (CHỈ xem — không bấm "GỬI YÊU CẦU")
      const step3NextButton = modal.getByRole('button', { name: 'Tiếp theo' });
      if ((await step3NextButton.count()) > 0 && (await step3NextButton.isEnabled())) {
        await step3NextButton.click();
        await page.waitForTimeout(400);
        await shot(page, '08-booking-modal-step4');
      } else {
        console.warn('Không thể qua Bước 4 (chưa chọn được khung giờ hợp lệ).');
      }
    } else {
      console.warn('Nút "Tiếp theo" bị disable ở Bước 1 — có thể do chưa chọn được môn/học sinh.');
    }
  } else {
    console.warn('Bỏ qua Booking Modal — thiếu E2E_PARENT_EMAIL / E2E_TEST_PASSWORD trong .env.local');
  }

  await browser.close();
  console.log('\nHoàn tất Workflow 2.');
};

run();

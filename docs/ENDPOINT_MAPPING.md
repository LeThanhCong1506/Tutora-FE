# Tutora Backend — Endpoint Migration Guide

> Tài liệu này liệt kê toàn bộ endpoint cũ → mới sau khi refactor theo REST convention.
> Ngày cập nhật: 2026-05-16
>
> **Convention áp dụng:**
> - Plural resource: `tutors`, `feedbacks`, `tokens`, ...
> - kebab-case: `bank-verification`, `push-tokens`, ...
> - Non-CRUD action dùng sub-path verb: `/accept`, `/approve`, `/confirm`, ...
> - Generic `{id}` thay vì `{tutorId}`, `{lessonId}`, `{bookingId}`, ...

---

## AUTH

| Verb | Old | New |
|------|-----|-----|
| POST | `api/SimpleAuth/login` | `api/auth/login` |
| POST | `api/SimpleAuth/register` | `api/auth/register` |
| POST | `api/auth/login-zalo` | `api/auth/zalo/login` |
| POST | `api/auth/login-supabase` | `api/auth/supabase/login` |
| POST | `api/auth/register-supabase` | `api/auth/supabase/register` |
| GET | `api/auth/google/authorize` | `api/auth/google/authorize` ✅ |
| GET | `api/auth/google/callback` | `api/auth/google/callback` ✅ |
| GET | `api/auth/google/status` | `api/auth/google/status` ✅ |
| DELETE | `api/auth/google/disconnect` | `api/auth/google/disconnect` ✅ |

---

## TOKENS

| Verb | Old | New |
|------|-----|-----|
| POST | `api/Token/refresh` | `api/tokens/refresh` |
| POST | `api/Token/revoke` | `api/tokens/revoke` |

---

## USERS

| Verb | Old | New |
|------|-----|-----|
| GET | `api/users` | `api/users` ✅ |
| POST | `api/users` | `api/users` ✅ |
| GET | `api/users/{id}` | `api/users/{id}` ✅ |
| PUT | `api/users/{id}` | `api/users/{id}` ✅ |
| DELETE | `api/users/{id}` | `api/users/{id}` ✅ |
| PUT | `api/users/{id}/avatar` | `api/users/{id}/avatar` ✅ |
| PATCH | `api/users/{id}/zalo-notify` | `api/users/{id}/zalo-notify` ✅ |
| GET | `api/users/by-email/{email}` | `api/users/by-email/{email}` ✅ |
| GET | `api/users/staffs` | `api/users/staffs` ✅ |
| GET | `api/users/tour-status` | `api/users/tour-status` ✅ |
| PUT | `api/users/complete-tour` | `api/users/complete-tour` ✅ |
| PUT | `api/passwords/change` | `api/passwords/change` ✅ |
| PUT | `api/passwords/sync` | `api/passwords/sync` ✅ |

---

## TUTORS — Profile & Onboarding

| Verb | Old | New |
|------|-----|-----|
| GET | `api/Tutor` *(query: tutorId)* | `api/tutors/{id}` |
| GET | `api/Tutor/{id}/tutor-profile-info` | `api/tutors/{id}/profile` |
| GET | `api/Tutor/{id}/full-profile-landing-page` | `api/tutors/{id}/full-profile` |
| GET | `api/Tutor/subject/{subjectId}` | `api/tutors/subjects/{id}` |
| GET | `api/Tutor/pending` | `api/tutors/pending` |
| GET | `api/tutor-search` | `api/tutors/search` |
| PUT | `api/tutor-verification/{id}/tutor-profile/basic-info` | `api/tutors/{id}/profile/basic-info` |
| PUT | `api/tutor-verification/{id}/tutor-profile/introduction` | `api/tutors/{id}/profile/introduction` |
| PUT | `api/tutor-verification/{id}/tutor-profile/video` | `api/tutors/{id}/profile/video` |
| PUT | `api/tutor-verification/{id}/tutor-profile/avatar` | `api/tutors/{id}/profile/avatar` |
| PUT | `api/tutor-verification/{id}/tutor-profile/pricing` | `api/tutors/{id}/profile/pricing` |
| GET | `api/tutor-verification/{id}/tutor-profile/pricing` | `api/tutors/{id}/profile/pricing` |
| POST | `api/tutor-verification/{id}/tutor-profile/certificates` | `api/tutors/{id}/profile/certificates` |
| GET | `api/tutor-verification/{id}/tutor-profile/certificates` | `api/tutors/{id}/profile/certificates` |
| DELETE | `api/tutor-verification/{id}/tutor-profile/certificates/{certificateId}` | `api/tutors/{id}/profile/certificates/{certId}` |
| GET | `api/tutor-verification/{id}/progress` | `api/tutors/{id}/verification/progress` |
| POST | `api/tutor-verification/{id}/submit-for-review` | `api/tutors/{id}/submit-for-review` |
| POST | `api/tutor-verification/submit` | `api/tutors/verification/submit` |

---

## TUTOR — Availability

| Verb | Old | New |
|------|-----|-----|
| GET | `api/tutor/availability` | `api/tutor/availabilities` |
| POST | `api/tutor/availability` | `api/tutor/availabilities` |
| GET | `api/tutor/availability/{tutorId}` | `api/tutor/availabilities/{id}` |
| PUT | `api/tutor/availability/{id:int}` | `api/tutor/availabilities/{id}` |
| DELETE | `api/tutor/availability/{id:int}` | `api/tutor/availabilities/{id}` |

---

## TUTOR — Lessons

| Verb | Old | New |
|------|-----|-----|
| GET | `api/tutorlesson/lessons` | `api/tutor/lessons` |
| GET | `api/tutorlesson/calendar` | `api/tutor/lessons/calendar` |
| GET | `api/tutorlesson/dashboard` | `api/tutor/lessons/dashboard` |
| GET | `api/tutorlesson/{lessonId}` | `api/tutor/lessons/{id}` |
| PUT | `api/tutorlesson/{lessonId}/report` | `api/tutor/lessons/{id}/report` |
| POST | `api/tutorlesson/{lessonId}/attachments` | `api/tutor/lessons/{id}/attachments` |

---

## TUTOR — Finance & Bank

| Verb | Old | New |
|------|-----|-----|
| GET | `api/tutor/finance/summary` | `api/tutor/finance/summary` ✅ |
| GET | `api/tutor/finance/earnings` | `api/tutor/finance/earnings` ✅ |
| GET | `api/tutor/finance/transactions` | `api/tutor/finance/transactions` ✅ |
| GET | `api/tutor/finance/transactions/{id}` | `api/tutor/finance/transactions/{id}` ✅ |
| GET | `api/tutor/bank-info` | `api/tutor/bank` |
| PUT | `api/tutor/bank-info` | `api/tutor/bank` |
| POST | `api/tutor/withdrawals` | `api/tutor/withdrawals` ✅ |
| GET | `api/tutor/withdrawals` | `api/tutor/withdrawals` ✅ |
| GET | `api/tutor/withdrawals/{id}` | `api/tutor/withdrawals/{id}` ✅ |
| DELETE | `api/tutor/withdrawals/{id}` | `api/tutor/withdrawals/{id}` ✅ |
| GET | `api/tutor/wallet/summary` | `api/tutor/wallet/summary` ✅ |

---

## TUTOR — Bank Verification

| Verb | Old | New |
|------|-----|-----|
| POST | `api/tutor/bank-info/request-verify` | `api/tutor/bank-verification/request` |
| POST | `api/tutor/bank-info/confirm-verify` | `api/tutor/bank-verification/confirm` |
| GET | `api/tutor/bank-info/verify-status` | `api/tutor/bank-verification/status` |

---

## TUTOR — Bookings

| Verb | Old | New |
|------|-----|-----|
| GET | `api/tutors/bookings` | `api/tutors/bookings` ✅ |
| POST | `api/tutors/bookings/{id}/accept` | `api/tutors/bookings/{id}/accept` ✅ |
| POST | `api/tutors/bookings/{id}/decline` | `api/tutors/bookings/{id}/decline` ✅ |

---

## BOOKINGS (Parent / Student)

| Verb | Old | New |
|------|-----|-----|
| POST | `api/bookings` | `api/bookings` ✅ |
| GET | `api/parent/bookings` | `api/bookings` *(differentiated by role in JWT)* |
| GET | `api/student/bookings` | `api/bookings` *(differentiated by role in JWT)* |
| GET | `api/bookings/{id:int}` | `api/bookings/{id}` |
| DELETE | `api/bookings/{id:int}` | `api/bookings/{id}` |
| POST | `api/bookings/{id:int}/apply-promotion` | `api/bookings/{id}/apply-promotion` |

---

## PAYMENTS

| Verb | Old | New |
|------|-----|-----|
| GET | `api/bookings/{id:int}/payment-info` | `api/bookings/{id}/payment` |
| GET | `api/bookings/{id:int}/payment-status` | `api/bookings/{id}/payment/status` |
| POST | `api/bookings/{id:int}/pay-with-wallet` | `api/bookings/{id}/pay/wallet` |
| POST | `api/webhooks/payos` | `api/webhooks/payos` ✅ |
| POST | `api/admin/bookings/{id:int}/confirm-payment` | `api/admin/bookings/{id}/payment/confirm` |
| GET | `/payment/success` | `/payment/success` ✅ *(callback, không đổi)* |
| GET | `/payment/cancel` | `/payment/cancel` ✅ *(callback, không đổi)* |

---

## WALLET

| Verb | Old | New |
|------|-----|-----|
| POST | `api/wallet/topup` | `api/wallet/top-up` |
| GET | `api/wallet/balance` | `api/wallet/balance` ✅ |
| GET | `api/wallet/transactions` | `api/wallet/transactions` ✅ |

---

## PROMOTIONS

| Verb | Old | New |
|------|-----|-----|
| GET | `api/promotions/validate` | `api/promotions/validate` ✅ |
| POST | `api/promotions` | `api/promotions` ✅ |

---

## LESSONS (Shared)

| Verb | Old | New |
|------|-----|-----|
| GET | `api/parent/lessons` | `api/parent/lessons` ✅ |
| GET | `api/lessons/{id:int}` | `api/lessons/{id}` |

---

## PARENT — Lessons

| Verb | Old | New |
|------|-----|-----|
| GET | `api/ParentLesson/pending` | `api/parent/lessons/pending` |
| GET | `api/ParentLesson/{lessonId:int}` | `api/parent/lessons/{id}` |
| PUT | `api/ParentLesson/{lessonId:int}/confirm` | `api/parent/lessons/{id}/confirm` |
| GET | `api/ParentLesson/calendar` | `api/parent/lessons/calendar` |

---

## STUDENT — Lessons

| Verb | Old | New |
|------|-----|-----|
| GET | `api/student/lessons` | `api/student/lessons` ✅ |
| GET | `api/student/lessons/pending` | `api/student/lessons/pending` ✅ |
| GET | `api/student/lessons/{lessonId}` | `api/student/lessons/{id}` |
| PUT | `api/student/lessons/{lessonId}/confirm` | `api/student/lessons/{id}/confirm` |

---

## PARENT — Students

| Verb | Old | New |
|------|-----|-----|
| GET | `api/parent/students` | `api/parent/students` ✅ |
| POST | `api/parent/students` | `api/parent/students` ✅ |
| GET | `api/parent/students/{id}` | `api/parent/students/{id}` ✅ |
| PUT | `api/parent/students/{id}` | `api/parent/students/{id}` ✅ |
| DELETE | `api/parent/students/{id}` | `api/parent/students/{id}` ✅ |
| POST | `api/parent/students/{id}/avatar` | `api/parent/students/{id}/avatar` ✅ |
| PUT | `api/parent/students/{id}/reset-password` | `api/parent/students/{id}/reset-password` ✅ |
| POST | `api/parent/students/{id}/link-code` | `api/parent/students/{id}/generate-link-code` |
| POST | `api/parent/students/link-with-code` | `api/parent/students/link` |
| GET | `api/parent/students/my-link-status` | `api/parent/students/link-status` |
| POST | `api/parent/students/parent-code` | `api/parent/students/generate-parent-code` |
| POST | `api/parent/students/self-link` | `api/parent/students/self-link` ✅ |

---

## FEEDBACK

| Verb | Old | New |
|------|-----|-----|
| POST | `api/feedback` | `api/feedbacks` |
| GET | `api/feedback/tutor/{tutorId}` | `api/feedbacks/tutors/{id}` |
| GET | `api/feedback/tutor/{tutorId}/stats` | `api/feedbacks/tutors/{id}/stats` |
| GET | `api/feedback/can-leave/{lessonId}` | `api/feedbacks/eligibility/lessons/{id}` |
| GET | `api/feedback/can-leave-booking/{bookingId}` | `api/feedbacks/eligibility/bookings/{id}` |
| PUT | `api/feedback/{feedbackId}/reply` | `api/feedbacks/{id}/reply` |
| PUT | `api/feedback/{feedbackId}/toggle-visibility` | `api/feedbacks/{id}/visibility` |

---

## CHAT

| Verb | Old | New |
|------|-----|-----|
| GET | `api/chat/channels` | `api/chat/channels` ✅ |
| POST | `api/chat/channels` | `api/chat/channels` ✅ |
| GET | `api/chat/channels/{id}/messages` | `api/chat/channels/{id}/messages` ✅ |
| POST | `api/chat/channels/{id}/messages` | `api/chat/channels/{id}/messages` ✅ |
| PUT | `api/chat/channels/{id}/read` | `api/chat/channels/{id}/read` ✅ |
| POST | `api/chat/channels/{id}/upload-image` | `api/chat/channels/{id}/images` |

---

## NOTIFICATIONS

| Verb | Old | New |
|------|-----|-----|
| POST | `api/notifications` | `api/notifications` ✅ |
| POST | `api/notifications/bulk` | `api/notifications/bulk` ✅ |
| GET | `api/notifications/my-notifications` | `api/notifications/mine` |
| GET | `api/notifications/my-notifications/unread` | `api/notifications/mine/unread` |
| GET | `api/notifications/my-notifications/unread-count` | `api/notifications/mine/unread-count` |
| DELETE | `api/notifications/my-notifications` | `api/notifications/mine` |
| GET | `api/notifications/{id}` | `api/notifications/{id}` ✅ |
| DELETE | `api/notifications/{id}` | `api/notifications/{id}` ✅ |
| GET | `api/notifications/all` | `api/notifications/all` ✅ |
| GET | `api/notifications/user/{userId}` | `api/notifications/users/{id}` |
| DELETE | `api/notifications/user/{userId}` | `api/notifications/users/{id}` |
| PUT | `api/notifications/{id}/mark-read` | `api/notifications/{id}/read` |
| PUT | `api/notifications/mark-all-read` | `api/notifications/read-all` |
| DELETE | `api/notifications/old/{daysOld}` | `api/notifications/old/{daysOld}` ✅ |
| POST | `api/notifications/test/{userId}` | `api/notifications/test/{userId}` ✅ |

---

## PROGRESS

| Verb | Old | New |
|------|-----|-----|
| GET | `api/progress/subject-completion` | `api/progress/subject-completion` ✅ |
| GET | `api/progress/overall-completion` | `api/progress/overall-completion` ✅ |

---

## BANKS

| Verb | Old | New |
|------|-----|-----|
| GET | `api/banks` | `api/banks` ✅ |

---

## EXPORT

| Verb | Old | New |
|------|-----|-----|
| GET | `api/export/students-excel` | `api/export/students` |
| GET | `api/export/parents-excel` | `api/export/parents` |
| GET | `api/export/mocktest-excel/{testId}` | `api/export/mock-tests/{id}` |
| GET | `api/export/tutor/lessons-excel` | `api/export/tutor/lessons` |
| GET | `api/export/tutor/earnings-excel` | `api/export/tutor/earnings` |
| GET | `api/export/tutor/feedbacks-excel` | `api/export/tutor/feedbacks` |

---

## PUSH TOKENS

| Verb | Old | New |
|------|-----|-----|
| POST | `api/push-token/save` | `api/push-tokens` |
| DELETE | `api/push-token/remove/{userId}` | `api/push-tokens/{id}` |

---

## WEBHOOKS

| Verb | Old | New |
|------|-----|-----|
| POST | `api/webhook/zalo` | `api/webhooks/zalo` |
| POST | `api/webhooks/payos` | `api/webhooks/payos` ✅ |
| POST | `api/webhooks/zalopay` | `api/webhooks/zalopay` ✅ |

---

## ZALOPAY

| Verb | Old | New |
|------|-----|-----|
| POST | `api/payment/zalopay/create-order` | `api/payments/zalopay/orders` |
| POST | `api/payment/zalopay/confirm` | `api/payments/zalopay/confirm` |

---

## ADMIN — Users

| Verb | Old | New |
|------|-----|-----|
| GET | `api/admin/users` | `api/admin/users` ✅ |
| GET | `api/admin/users/{id}` | `api/admin/users/{id}` ✅ |
| PUT | `api/admin/users/{id}` | `api/admin/users/{id}` ✅ |
| DELETE | `api/admin/users/{id}` | `api/admin/users/{id}` ✅ |
| PUT | `api/admin/users/{id}/deactivate` | `api/admin/users/{id}/deactivate` ✅ |

---

## ADMIN — Tutors

| Verb | Old | New |
|------|-----|-----|
| PUT | `api/admin/tutors/{id}/approval` | `api/admin/tutors/{id}/approve` |

---

## ADMIN — Payouts

| Verb | Old | New |
|------|-----|-----|
| GET | `api/admin/payout/overview` | `api/admin/payouts/overview` |
| GET | `api/admin/payout/pending-review` | `api/admin/payouts/pending` |
| GET | `api/admin/payout/requests` | `api/admin/payouts` |
| GET | `api/admin/payout/requests/{id}` | `api/admin/payouts/{id}` |
| POST | `api/admin/payout/requests/{id}/approve` | `api/admin/payouts/{id}/approve` |
| POST | `api/admin/payout/requests/{id}/reject` | `api/admin/payouts/{id}/reject` |
| GET | `api/admin/payout/payos-balance` | `api/admin/payouts/payos-balance` |
| GET | `api/admin/payout/fraud-logs` | `api/admin/payouts/fraud-logs` |
| GET | `api/admin/payout/system-alerts` | `api/admin/system-alerts` |
| POST | `api/admin/payout/system-alerts/{id}/resolve` | `api/admin/system-alerts/{id}/resolve` |
| POST | `api/admin/bookings/{id:int}/confirm-payment` | `api/admin/bookings/{id}/payment/confirm` |

---

## ADMIN — Disputes

| Verb | Old | New |
|------|-----|-----|
| GET | `api/admin/Dispute` | `api/admin/disputes` |
| GET | `api/admin/Dispute/stats` | `api/admin/disputes/stats` |
| GET | `api/admin/Dispute/{disputeId}` | `api/admin/disputes/{id}` |
| GET | `api/admin/Dispute/{disputeId}/chat` | `api/admin/disputes/{id}/chat` |
| PUT | `api/admin/Dispute/{disputeId}/investigate` | `api/admin/disputes/{id}/investigate` |
| PUT | `api/admin/Dispute/{disputeId}/resolve` | `api/admin/disputes/{id}/resolve` |

---

## ADMIN — Warnings & Suspensions

| Verb | Old | New |
|------|-----|-----|
| POST | `api/admin/Warning/user/{userId}` | `api/admin/warnings/users/{id}` |
| GET | `api/admin/Warning/user/{userId}` | `api/admin/warnings/users/{id}` |
| POST | `api/admin/Warning/user/{userId}/suspend` | `api/admin/warnings/users/{id}/suspend` |
| PUT | `api/admin/Warning/user/{userId}/unsuspend` | `api/admin/warnings/users/{id}/unsuspend` |
| GET | `api/admin/Warning/suspensions` | `api/admin/warnings/suspensions` |

---

## DEBUG / TEST

> Các endpoint này chỉ dùng cho môi trường dev. Nên guard bằng environment check hoặc xóa trước khi production.

| Verb | Old | New |
|------|-----|-----|
| DELETE | `api/UserTest/delete-user-for-test/{userId}` | `api/debug/users/{id}` |
| GET | `api/UserTest/fix-booking/{id}` | `api/debug/bookings/{id}/fix` |
| POST | `api/debug/create-lessons/{bookingId:int}` | `api/debug/bookings/{id}/create-lessons` |

---

## Quick Reference — Nhóm thay đổi lớn

| Nhóm | Thay đổi chính |
|------|----------------|
| Auth | `api/SimpleAuth/*` → `api/auth/*` |
| Auth | `login-zalo` → `api/auth/zalo/login` |
| Auth | `login-supabase` → `api/auth/supabase/login` |
| Token | `api/Token/*` → `api/tokens/*` |
| Tutor profile | `api/Tutor/*` → `api/tutors/*` |
| Tutor onboarding | `api/tutor-verification/*` → `api/tutors/{id}/profile/*` |
| Tutor lessons | `api/tutorlesson/*` → `api/tutor/lessons/*` |
| Tutor availability | `api/tutor/availability` → `api/tutor/availabilities` |
| Tutor bank | `api/tutor/bank-info` → `api/tutor/bank` |
| Tutor bank verify | `api/tutor/bank-info/request-verify` → `api/tutor/bank-verification/request` |
| Bookings | `api/parent/bookings` + `api/student/bookings` → `api/bookings` |
| Payment | `payment-info` → `payment`, `payment-status` → `payment/status` |
| Parent lessons | `api/ParentLesson/*` → `api/parent/lessons/*` |
| Feedback | `api/feedback/*` → `api/feedbacks/*` |
| Notifications | `my-notifications` → `mine`, `mark-read` → `read`, `user/{id}` → `users/{id}` |
| Admin disputes | `api/admin/Dispute/*` → `api/admin/disputes/*` |
| Admin warnings | `api/admin/Warning/*` → `api/admin/warnings/*` |
| Admin payouts | `api/admin/payout/*` → `api/admin/payouts/*` |
| Push tokens | `api/push-token/*` → `api/push-tokens/*` |
| Webhook | `api/webhook/zalo` → `api/webhooks/zalo` |
| ZaloPay | `api/payment/zalopay/*` → `api/payments/zalopay/*` |
| Chat | `channels/{id}/upload-image` → `channels/{id}/images` |
| Export | bỏ suffix `-excel` khỏi tất cả route |
| Wallet | `topup` → `top-up` |

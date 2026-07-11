import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { getUserIdFromToken } from '../../../../services/auth.service';
import { addSubjectGradePrice, getPricing, updatePricing } from '../../../../services/tutorProfile.service';
import {
  getMyAvailability,
  bulkCreateAvailabilities,
  bulkUpdateAvailabilities,
  bulkDeleteAvailabilities,
  type AvailabilitySlot,
} from '../../../../services/availability.service';
import {
  getPackages,
  createPackage,
  updatePackage,
  deactivatePackage,
  type TutorPackageResponse,
} from '../../../../services/tutorPackages.service';

import {
  priceItemToRecord,
  recordsToPricingPayload,
  expandAvailabilityToCells,
  diffAvailability,
  normalizeHHmm,
  isoDayToFe,
  packageToFixedCombo,
  comboToPackagePayload,
  DEFAULT_FLEXIBLE_PACKAGE,
  recordToSubjectGradePricePayload,
} from '../api-mapping';
import type { OnboardingState, SubjectRecord, TutorAvailabilitySlot } from '../types';
import type { FixedCombo } from '../../../../types/combo.types';

type HydrateFn = (data: Partial<Pick<OnboardingState, 'subjectRecords' | 'availability' | 'combos'>>) => void;
type SubjectRecordInput = Omit<SubjectRecord, 'id'>;

const getPackageIdFromComboId = (comboId: string): number | null => {
  const match = /^pkg_(\d+)$/.exec(comboId);
  if (!match) return null;
  const packageId = Number(match[1]);
  return Number.isFinite(packageId) ? packageId : null;
};

const slotKey = (slot: { dayOfWeek: number; startTime: string; endTime: string }) =>
  `${isoDayToFe(slot.dayOfWeek)}|${normalizeHHmm(slot.startTime)}|${normalizeHHmm(slot.endTime)}`;

// Bóc field `message` từ envelope APIResponse của BE ({ content, statusCode, message, error }).
// Phần lớn message BE đã là tiếng Việt (vd validation giá) → hiển thị trực tiếp; trả về
// `fallback` khi không có message.
const extractApiError = (err: unknown, fallback: string): string => {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return msg && msg.trim() ? msg : fallback;
};

// Như extractApiError nhưng dịch riêng message overlap của POST lịch rảnh (tiếng Anh:
// "... overlaps with existing slot: HH:mm - HH:mm") sang tiếng Việt; các message còn lại
// (PATCH/DELETE) đã là tiếng Việt → giữ nguyên.
const extractAvailabilityError = (err: unknown, fallback: string): string => {
  const msg = extractApiError(err, '');
  if (!msg) return fallback;
  if (/overlaps with/i.test(msg)) {
    const m = msg.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    return m
      ? `Khung giờ bị trùng với lịch hiện có: ${m[1]} - ${m[2]}`
      : 'Khung giờ bị trùng với lịch rảnh hiện có.';
  }
  return msg;
};

const fixedPackageMatchesCombo = (pkg: TutorPackageResponse, combo: FixedCombo) => {
  const payload = comboToPackagePayload(combo);
  if (pkg.packageType !== 2) return false;
  if ((pkg.name ?? '').trim() !== payload.name.trim()) return false;

  const packageSlots = (pkg.fixedSlots ?? []).map(slotKey).sort();
  const comboSlots = payload.fixedSlots.map(slotKey).sort();
  if (packageSlots.length !== comboSlots.length) return false;
  return packageSlots.every((key, index) => key === comboSlots[index]);
};

/**
 * Đồng bộ trạng thái onboarding với BE (upsert), LƯU TỪNG BƯỚC:
 * - Mount: load pricing + availability + packages → hydrate state.
 * - saveAvailability(): diff availability (Bước 1 → "Tiếp tục").
 * - savePricing(): PUT thay toàn bộ giá theo môn/lớp (Bước 2 → "Tiếp tục").
 * - createFixedPackage(): tạo ngay gói fixed khi tutor bấm "Tạo gói".
 * - updateFixedPackage(): PUT sửa gói tại chỗ (giữ packageId) khi tutor bấm "Cập nhật gói".
 * - savePackages(): reconcile gói fixed + đảm bảo 1 gói flexible (Bước 3 → "Hoàn tất").
 * Gói có hasActiveBooking (đang có buổi dạy được đặt) bị BE chặn sửa/xóa bằng 409 —
 * FE khóa nút từ trước, message 409 hiển thị nguyên văn nếu vẫn lọt tới BE.
 * Mỗi hàm refresh ref tương ứng sau khi lưu để lần lưu kế tiếp diff đúng.
 */
export function useOnboardingSync(hydrate: HydrateFn) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const rawAvailabilityRef = useRef<AvailabilitySlot[]>([]);
  const loadedFixedRef = useRef<TutorPackageResponse[]>([]);
  const loadedFlexibleRef = useRef<TutorPackageResponse[]>([]);

  const load = useCallback(async () => {
    const userId = getUserIdFromToken();
    userIdRef.current = userId;
    if (!userId) {
      setLoadError('Không xác định được tài khoản gia sư. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const [pricingR, availR, pkgR] = await Promise.allSettled([
      getPricing(userId),
      getMyAvailability(),
      getPackages(userId, false),
    ]);

    const records: SubjectRecord[] =
      pricingR.status === 'fulfilled' ? (pricingR.value.content?.subjectGradePrices ?? []).map(priceItemToRecord) : [];

    let availability: TutorAvailabilitySlot[] = [];
    if (availR.status === 'fulfilled') {
      rawAvailabilityRef.current = availR.value.content ?? [];
      availability = rawAvailabilityRef.current.flatMap(expandAvailabilityToCells);
    }

    let combos: FixedCombo[] = [];
    if (pkgR.status === 'fulfilled') {
      const pkgs = pkgR.value.content ?? [];
      loadedFixedRef.current = pkgs.filter((p) => p.packageType === 2 && p.isActive);
      loadedFlexibleRef.current = pkgs.filter((p) => p.packageType === 1 && p.isActive);
      combos = loadedFixedRef.current.map(packageToFixedCombo);
    }

    if (pricingR.status === 'rejected' && availR.status === 'rejected' && pkgR.status === 'rejected') {
      setLoadError('Không tải được dữ liệu thiết lập. Kiểm tra kết nối và thử lại.');
    }

    hydrate({ subjectRecords: records, availability, combos });
    setLoading(false);
  }, [hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPackages = useCallback(async (userId: string) => {
    const fresh = await getPackages(userId, false);
    const pkgs = fresh.content ?? [];
    loadedFixedRef.current = pkgs.filter((p) => p.packageType === 2 && p.isActive);
    loadedFlexibleRef.current = pkgs.filter((p) => p.packageType === 1 && p.isActive);
    return pkgs;
  }, []);

  const ensureFlexiblePackage = useCallback(async (userId: string) => {
    if (loadedFlexibleRef.current.length > 0) return;

    await refreshPackages(userId);
    if (loadedFlexibleRef.current.length > 0) return;

    await createPackage(userId, DEFAULT_FLEXIBLE_PACKAGE);
    await refreshPackages(userId);
  }, [refreshPackages]);

  // ── Bước 1: Lịch rảnh ──────────────────────────────────────────
  const saveAvailability = useCallback(
    async (availability: TutorAvailabilitySlot[]): Promise<boolean> => {
      if (!userIdRef.current) {
        toast.error('Không xác định được tài khoản gia sư.');
        return false;
      }
      setSaving(true);

      // Đồng bộ ref với BE để lần lưu kế tiếp diff đúng (kể cả khi lưu lỗi giữa chừng).
      const resyncRef = async () => {
        try {
          const fresh = await getMyAvailability();
          rawAvailabilityRef.current = fresh.content ?? [];
        } catch {
          /* giữ ref cũ nếu refetch lỗi */
        }
      };

      try {
        // Gộp ô 30' liền kề → cụm, rồi diff theo ngày thành 3 nhóm thao tác tối thiểu.
        // Vd T2 06:00-10:00 + 15:00-18:00 → 2 record (mỗi cụm 1 record), không phải 14 ô.
        const { toCreate, toUpdate, toDelete } = diffAvailability(availability, rawAvailabilityRef.current);

        // Không đổi gì → bỏ qua mọi request (idempotent), chỉ đảm bảo có gói linh hoạt.
        if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
          if (availability.length > 0) await ensureFlexiblePackage(userIdRef.current);
          return true;
        }

        // Thứ tự bắt buộc: DELETE → PATCH → POST. Cụm mong muốn không bao giờ chồng nhau,
        // nên thứ tự này không kích hoạt guard "trùng giờ" của BE (slot cũ đã bị xoá/đổi trước).
        if (toDelete.length > 0) await bulkDeleteAvailabilities(toDelete);
        if (toUpdate.length > 0) await bulkUpdateAvailabilities(toUpdate);
        if (toCreate.length > 0) await bulkCreateAvailabilities(toCreate);

        await resyncRef();
        if (availability.length > 0) {
          await ensureFlexiblePackage(userIdRef.current);
        }
        return true;
      } catch (err) {
        console.error('[Onboarding] saveAvailability:', err);
        toast.error(extractAvailabilityError(err, 'Lưu lịch rảnh thất bại.'));
        // Một số thao tác có thể đã áp dụng trước khi lỗi → đồng bộ lại để retry diff đúng.
        await resyncRef();
        return false;
      } finally {
        setSaving(false);
      }
    },
    [ensureFlexiblePackage],
  );

  // ── Bước 2: Môn học & giá ──────────────────────────────────────
  const createSubjectRecord = useCallback(
    async (record: SubjectRecordInput): Promise<SubjectRecord | null> => {
      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Không xác định được tài khoản gia sư.');
        return null;
      }

      setSaving(true);
      try {
        const response = await addSubjectGradePrice(userId, recordToSubjectGradePricePayload(record));
        if (!response.content) {
          toast.error('Đã thêm cấu hình nhưng chưa nhận được dữ liệu phản hồi.');
          return null;
        }

        const created = priceItemToRecord(response.content);
        toast.success('Đã thêm cấu hình');
        return created;
      } catch (err) {
        console.error('[Onboarding] createSubjectRecord:', err);
        toast.error(extractApiError(err, 'Thêm cấu hình thất bại.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const savePricing = useCallback(async (subjectRecords: SubjectRecord[]): Promise<boolean> => {
    const userId = userIdRef.current;
    if (!userId) {
      toast.error('Không xác định được tài khoản gia sư.');
      return false;
    }
    setSaving(true);
    try {
      await updatePricing(userId, recordsToPricingPayload(subjectRecords));
      return true;
    } catch (err) {
      console.error('[Onboarding] savePricing:', err);
      toast.error(extractApiError(err, 'Lưu môn học & giá thất bại.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Bước 3: Gói lịch học ───────────────────────────────────────
  const createFixedPackage = useCallback(
    async (combo: FixedCombo): Promise<FixedCombo | null> => {
      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Không xác định được tài khoản gia sư.');
        return null;
      }

      setSaving(true);
      try {
        const response = await createPackage(userId, comboToPackagePayload(combo));
        await refreshPackages(userId);

        const createdPackage =
          response.content ??
          [...loadedFixedRef.current]
            .filter((pkg) => fixedPackageMatchesCombo(pkg, combo))
            .sort((a, b) => b.packageId - a.packageId)[0];

        if (!createdPackage) {
          toast.error('Đã tạo gói nhưng chưa nhận được dữ liệu phản hồi.');
          return null;
        }

        toast.success('Đã tạo gói lịch học');
        return packageToFixedCombo(createdPackage);
      } catch (err) {
        console.error('[Onboarding] createFixedPackage:', err);
        toast.error(extractApiError(err, 'Tạo gói lịch học thất bại.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [refreshPackages],
  );

  // Sửa gói tại chỗ qua PUT (giữ nguyên packageId — parent đang mở form đặt gói không bị đứt).
  // Trả combo đã cập nhật theo BE, hoặc null khi lỗi (caller giữ modal mở để tutor sửa tiếp).
  const updateFixedPackage = useCallback(
    async (comboId: string, combo: FixedCombo): Promise<FixedCombo | null> => {
      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Không xác định được tài khoản gia sư.');
        return null;
      }

      // Combo chưa từng lưu BE (không có id pkg_) → không có gì để PUT; giữ chỉnh sửa local,
      // savePackages sẽ tạo mới khi bấm "Hoàn tất".
      const packageId = getPackageIdFromComboId(comboId);
      if (!packageId) return combo;

      setSaving(true);
      try {
        const response = await updatePackage(userId, packageId, comboToPackagePayload(combo));
        await refreshPackages(userId);

        const updatedPackage =
          response.content ?? loadedFixedRef.current.find((pkg) => pkg.packageId === packageId);
        if (!updatedPackage) {
          toast.error('Đã cập nhật gói nhưng chưa nhận được dữ liệu phản hồi.');
          return null;
        }

        toast.success('Đã cập nhật gói lịch học');
        return packageToFixedCombo(updatedPackage);
      } catch (err) {
        console.error('[Onboarding] updateFixedPackage:', err);
        toast.error(extractApiError(err, 'Cập nhật gói lịch học thất bại.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [refreshPackages],
  );

  const deactivateFixedPackage = useCallback(
    async (comboId: string): Promise<boolean> => {
      const packageId = getPackageIdFromComboId(comboId);
      if (!packageId) return true;

      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Không xác định được tài khoản gia sư.');
        return false;
      }

      setSaving(true);
      try {
        await deactivatePackage(userId, packageId);
        await refreshPackages(userId);
        toast.success('Đã xóa gói lịch học');
        return true;
      } catch (err) {
        console.error('[Onboarding] deactivateFixedPackage:', err);
        toast.error(extractApiError(err, 'Xóa gói lịch học thất bại.'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refreshPackages],
  );

  const savePackages = useCallback(
    async (combos: FixedCombo[]): Promise<boolean> => {
      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Không xác định được tài khoản gia sư.');
        return false;
      }
      setSaving(true);
      try {
        const currentPackages = await refreshPackages(userId);
        const activeFixedPackages = currentPackages.filter((p) => p.packageType === 2 && p.isActive);
        const activeFixedById = new Map(activeFixedPackages.map((pkg) => [pkg.packageId, pkg]));
        const comboPackageIds = new Set<number>();
        const operations: Promise<unknown>[] = [];

        combos.forEach((combo) => {
          const packageId = getPackageIdFromComboId(combo.id);
          if (packageId) comboPackageIds.add(packageId);

          const existing = packageId ? activeFixedById.get(packageId) : undefined;
          if (!existing) {
            operations.push(createPackage(userId, comboToPackagePayload(combo)));
            return;
          }

          if (!fixedPackageMatchesCombo(existing, combo)) {
            // PUT tại chỗ (atomic, giữ packageId) — không deactivate+create như trước.
            operations.push(updatePackage(userId, existing.packageId, comboToPackagePayload(combo)));
          }
        });

        activeFixedPackages.forEach((pkg) => {
          if (!comboPackageIds.has(pkg.packageId)) {
            operations.push(deactivatePackage(userId, pkg.packageId));
          }
        });

        await Promise.all(operations);
        await ensureFlexiblePackage(userId);
        await refreshPackages(userId);
        hydrate({ combos: loadedFixedRef.current.map(packageToFixedCombo) });
        return true;
      } catch (err) {
        console.error('[Onboarding] savePackages:', err);
        toast.error(extractApiError(err, 'Lưu gói lịch học thất bại.'));
        // Một số thao tác có thể đã áp dụng trước khi lỗi → đồng bộ lại state theo BE.
        try {
          await refreshPackages(userId);
          hydrate({ combos: loadedFixedRef.current.map(packageToFixedCombo) });
        } catch {
          /* giữ state cũ nếu refetch lỗi */
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [ensureFlexiblePackage, hydrate, refreshPackages],
  );

  return {
    loading,
    saving,
    loadError,
    saveAvailability,
    createSubjectRecord,
    savePricing,
    createFixedPackage,
    updateFixedPackage,
    deactivateFixedPackage,
    savePackages,
    reload: load,
  };
}

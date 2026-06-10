import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { getUserIdFromToken } from '../../../../services/auth.service';
import { addSubjectGradePrice, getPricing, updatePricing } from '../../../../services/tutorProfile.service';
import {
  getMyAvailability,
  bulkCreateAvailabilities,
  bulkDeleteAvailabilities,
  type AvailabilitySlot,
} from '../../../../services/availability.service';
import {
  getPackages,
  createPackage,
  deactivatePackage,
  type TutorPackageResponse,
} from '../../../../services/tutorPackages.service';

import {
  priceItemToRecord,
  recordsToPricingPayload,
  expandAvailabilityToCells,
  availabilityKey,
  normalizeHHmm,
  feDayToIso,
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
 * - savePackages(): reconcile gói fixed + đảm bảo 1 gói flexible (Bước 3 → "Hoàn tất").
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
      try {
        // Diff theo TỪNG Ô 30' (mỗi ô = 1 record), gom vào 1 POST/bulk + 1 DELETE/bulk.
        const desiredKeys = new Set(availability.map((s) => availabilityKey(s.dayOfWeek, s.startTime, s.endTime)));
        // rawAvailabilityRef từ BE dùng ISO 1-7 → convert về FE 0-6 để so khoá thống nhất.
        const loadedKeys = new Set(
          rawAvailabilityRef.current.map((s) => availabilityKey(isoDayToFe(s.dayofweek), s.starttime, s.endtime)),
        );
        const toCreate = availability.filter(
          (s) => !loadedKeys.has(availabilityKey(s.dayOfWeek, s.startTime, s.endTime)),
        );
        const toDelete = rawAvailabilityRef.current.filter(
          (s) => !desiredKeys.has(availabilityKey(isoDayToFe(s.dayofweek), s.starttime, s.endtime)),
        );

        // Xoá trước (1 request), tạo sau (1 request) — tránh trùng giờ với slot cũ trên BE.
        if (toDelete.length > 0) {
          await bulkDeleteAvailabilities(toDelete.map((s) => s.availabilityid));
        }
        if (toCreate.length > 0) {
          await bulkCreateAvailabilities(
            toCreate.map((s) => ({
              dayofweek: feDayToIso(s.dayOfWeek), // FE 0-6 → BE ISO 1-7
              starttime: normalizeHHmm(s.startTime),
              endtime: normalizeHHmm(s.endTime),
            })),
          );
        }

        // Refresh ref để lần lưu sau diff đúng.
        const fresh = await getMyAvailability();
        rawAvailabilityRef.current = fresh.content ?? [];
        if (availability.length > 0) {
          await ensureFlexiblePackage(userIdRef.current);
        }
        return true;
      } catch (err) {
        console.error('[Onboarding] saveAvailability:', err);
        toast.error('Lưu lịch rảnh thất bại.');
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
        toast.error('Thêm cấu hình thất bại.');
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
      toast.error('Lưu môn học & giá thất bại.');
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
        toast.error('Tạo gói lịch học thất bại.');
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
        toast.error('Xóa gói lịch học thất bại.');
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
            operations.push(
              (async () => {
                await deactivatePackage(userId, existing.packageId);
                await createPackage(userId, comboToPackagePayload(combo));
              })(),
            );
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
        toast.error('Lưu gói lịch học thất bại.');
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
    deactivateFixedPackage,
    savePackages,
    reload: load,
  };
}

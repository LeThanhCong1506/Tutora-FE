/**
 * Utility helpers cho TutorDetail.
 * Pure functions — server + client đều dùng được.
 */

export const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '0đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatTeachingMode = (mode: string | null | undefined): string => {
  const m = (mode || '').toLowerCase();
  if (m === 'both' || m === 'hybrid') return 'Linh hoạt';
  if (m === 'online') return 'Online';
  if (m === 'offline') return 'Tại nhà';
  return mode || '—';
};

export const formatCity = (city: string | null | undefined): string => {
  const c = (city || '').toLowerCase();
  const map: Record<string, string> = {
    hochiminh: 'TP. Hồ Chí Minh',
    hanoi: 'Hà Nội',
    danang: 'Đà Nẵng',
    cantho: 'Cần Thơ',
    haiphong: 'Hải Phòng',
    binhduong: 'Bình Dương',
    dongnai: 'Đồng Nai',
  };
  return map[c] || city || 'Toàn quốc';
};

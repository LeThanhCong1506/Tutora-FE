// Hook lấy danh sách tỉnh/thành & phường/xã (API v2) cho UI — dùng chung giữa
// form hồ sơ gia sư và bộ lọc trang tìm kiếm. Dữ liệu + cache nằm ở location.service.
import { useEffect, useState } from 'react';
import { fetchProvinces, fetchWards, type Province, type Ward } from '../services/location.service';

/** Danh sách 34 tỉnh/thành. Tải một lần khi component mount. */
export function useProvinces() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProvinces();
        if (cancelled) return;
        setProvinces(data);
        setError(null);
      } catch {
        if (!cancelled) setError('Không tải được danh sách tỉnh/thành');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { provinces, loading, error };
}

/** Danh sách phường/xã của tỉnh `provinceCode`. Truyền `null` để bỏ trống. */
export function useWards(provinceCode: number | null) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (provinceCode == null) {
        setWards([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchWards(provinceCode);
        if (cancelled) return;
        setWards(data);
        setError(null);
      } catch {
        if (!cancelled) setError('Không tải được danh sách phường/xã');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  return { wards, loading, error };
}

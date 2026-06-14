// Dịch vụ địa danh Việt Nam — lấy từ provinces.open-api.vn (API v2, sau sáp nhập 07/2025).
// Mô hình 2 cấp: Tỉnh/Thành phố → Phường/Xã (KHÔNG còn cấp Quận/Huyện).
//
// Giá trị `name` (tên chính thức, vd "Thành phố Hồ Chí Minh") chính là thứ được LƯU vào
// teachingAreaCity/teachingAreaDistrict và dùng để filter search (BE so khớp CHÍNH XÁC),
// nên cả form profile lẫn dropdown search đều phải dùng đúng chuỗi `name` này.
//
// Dữ liệu được cache qua storageAdapter (web: localStorage, Zalo: zmp-sdk) để hạn chế gọi
// mạng và để app vẫn chạy khi API bên thứ 3 chậm/sập (fallback cache cũ).
import { storageAdapter } from './storage.adapter';

const API_BASE = 'https://provinces.open-api.vn/api/v2';

// Tăng version khi đổi cấu trúc cache để tự vô hiệu hoá cache cũ.
const CACHE_VERSION = 'v2';
const PROVINCES_KEY = `tutora_loc_provinces_${CACHE_VERSION}`;
const wardsKey = (code: number) => `tutora_loc_wards_${code}_${CACHE_VERSION}`;
// TTL 30 ngày — ranh giới hành chính hiếm khi đổi.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Province {
  /** Tên chính thức, vd "Thành phố Hồ Chí Minh" — giá trị được lưu & dùng filter. */
  name: string;
  /** Mã số tỉnh, dùng để gọi danh sách phường/xã. */
  code: number;
  /** Slug không dấu, vd "ho_chi_minh". */
  codename: string;
}

export interface Ward {
  name: string;
  code: number;
  codename: string;
  provinceCode: number;
}

interface CacheEntry<T> {
  ts: number;
  data: T;
}

async function readCache<T>(key: string, allowStale = false): Promise<T | null> {
  try {
    const raw = await storageAdapter.get(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.ts !== 'number') return null;
    if (!allowStale && Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    await storageAdapter.set(key, JSON.stringify({ ts: Date.now(), data } satisfies CacheEntry<T>));
  } catch {
    // Bỏ qua lỗi quota/storage — cache chỉ là tối ưu, không bắt buộc.
  }
}

/** Lấy danh sách 34 tỉnh/thành (v2). Ưu tiên cache; lỗi mạng thì fallback cache cũ. */
export async function fetchProvinces(): Promise<Province[]> {
  const cached = await readCache<Province[]>(PROVINCES_KEY);
  if (cached?.length) return cached;

  try {
    const res = await fetch(`${API_BASE}/p/`);
    if (!res.ok) throw new Error(`Province API trả về ${res.status}`);
    const raw = (await res.json()) as Array<{ name: string; code: number; codename: string }>;
    const provinces: Province[] = raw.map((p) => ({ name: p.name, code: p.code, codename: p.codename }));
    await writeCache(PROVINCES_KEY, provinces);
    return provinces;
  } catch (err) {
    const stale = await readCache<Province[]>(PROVINCES_KEY, true);
    if (stale?.length) return stale;
    throw err;
  }
}

/** Lấy danh sách phường/xã của một tỉnh theo mã `provinceCode` (depth=2). */
export async function fetchWards(provinceCode: number): Promise<Ward[]> {
  const key = wardsKey(provinceCode);
  const cached = await readCache<Ward[]>(key);
  if (cached?.length) return cached;

  try {
    const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
    if (!res.ok) throw new Error(`Ward API trả về ${res.status}`);
    const raw = (await res.json()) as { wards?: Array<{ name: string; code: number; codename: string }> };
    const wards: Ward[] = (raw.wards ?? []).map((w) => ({
      name: w.name,
      code: w.code,
      codename: w.codename,
      provinceCode,
    }));
    await writeCache(key, wards);
    return wards;
  } catch (err) {
    const stale = await readCache<Ward[]>(key, true);
    if (stale?.length) return stale;
    throw err;
  }
}

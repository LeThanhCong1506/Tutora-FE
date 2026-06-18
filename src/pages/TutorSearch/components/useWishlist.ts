import { useSyncExternalStore } from 'react';
import { storageAdapter } from '../../../services/storage.adapter';

// Danh sách gia sư yêu thích lưu cục bộ trên thiết bị (web: localStorage, Zalo: zmp storage).
// Chưa có API backend cho wishlist — store này giữ state trong session + persist qua storageAdapter.
const STORAGE_KEY = 'wishlistTutorIds';

let ids = new Set<string>();
let snapshot: ReadonlySet<string> = ids;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
  snapshot = new Set(ids);
  listeners.forEach((listener) => listener());
};

const hydrate = async () => {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await storageAdapter.get(STORAGE_KEY);
    if (raw) {
      ids = new Set(JSON.parse(raw) as string[]);
      emit();
    }
  } catch {
    /* bỏ qua dữ liệu hỏng */
  }
};

const persist = () => {
  void storageAdapter.set(STORAGE_KEY, JSON.stringify(Array.from(ids)));
};

export const wishlistStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    void hydrate();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): ReadonlySet<string> {
    return snapshot;
  },
  toggle(id: string) {
    if (ids.has(id)) ids.delete(id);
    else ids.add(id);
    emit();
    persist();
  },
};

/** Hook cho 1 gia sư: trả về trạng thái đã lưu + hàm toggle. */
export const useWishlist = (tutorId: string) => {
  const saved = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot);
  return {
    saved: saved.has(tutorId),
    toggle: () => wishlistStore.toggle(tutorId),
  };
};

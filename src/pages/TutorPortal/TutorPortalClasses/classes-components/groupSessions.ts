import type { ClassSessionResponse } from '../../../../services/classSession.service';

export interface SessionGroup {
    parent: ClassSessionResponse;
    children: ClassSessionResponse[];
}

const isExtra = (s: ClassSessionResponse) => Boolean(s.isContinuation || s.isDisputeRelearn);

const byStart = (a: ClassSessionResponse, b: ClassSessionResponse) =>
    new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();

/**
 * Gom buổi phụ / buổi học lại về đúng buổi GỐC thuộc gói.
 */
export function groupSessions(sessions: ClassSessionResponse[]): SessionGroup[] {
    const sorted = [...sessions].sort(byStart);
    const byId = new Map(sorted.map((s) => [s.classSessionId, s]));
    const groups = new Map<number, SessionGroup>();
    const orphans: ClassSessionResponse[] = [];

    for (const s of sorted) {
        if (!isExtra(s)) groups.set(s.classSessionId, { parent: s, children: [] });
    }

    /** Lần ngược chuỗi tới buổi thuộc gói; trả về undefined nếu không tới được. */
    const findRoot = (session: ClassSessionResponse) => {
        // `seen` chặn vòng lặp vô hạn nếu dữ liệu bị trỏ vòng (A → B → A).
        const seen = new Set<number>([session.classSessionId]);
        let current: ClassSessionResponse | undefined = session;

        while (current?.originalClassSessionId != null) {
            const parentId: number = current.originalClassSessionId;
            if (seen.has(parentId)) return undefined;
            seen.add(parentId);

            const group = groups.get(parentId);
            if (group) return group;

            current = byId.get(parentId);
        }

        return undefined;
    };

    for (const s of sorted) {
        if (!isExtra(s)) continue;

        const group = findRoot(s);
        if (group) group.children.push(s);
        else orphans.push(s);
    }

    return [
        ...groups.values(),
        ...orphans.map((parent) => ({ parent, children: [] as ClassSessionResponse[] })),
    ].sort((a, b) => byStart(a.parent, b.parent));
}

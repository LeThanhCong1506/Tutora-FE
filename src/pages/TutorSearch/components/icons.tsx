/* eslint-disable react-refresh/only-export-components -- module dùng chung: icon-component + hằng SubjectIcons + helper subjectIcon */
import type { ReactNode } from "react";

export const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.625 17.5C13.9773 17.5 17.5 13.9773 17.5 9.625C17.5 5.27269 13.9773 1.75 9.625 1.75C5.27269 1.75 1.75 5.27269 1.75 9.625C1.75 13.9773 5.27269 17.5 9.625 17.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.25 19.25L15.3125 15.3125" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const VerifiedIcon = () => (
    <svg width="7" height="7" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 2.625L3.5625 6.5625L1.5 4.5" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const UniversityIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1 2.7 2.4 6 2.4s6-1.4 6-2.4v-5" />
    </svg>
);

export const CheckIcon = () => (
    <svg width="6" height="4.5" viewBox="0 0 11 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 4L4 7L10 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const MinusIcon = () => (
    <svg width="6" height="2" viewBox="0 0 11 2" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const ArrowIcon = () => (
    <svg width="9" height="4" viewBox="0 0 12 4" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 2H11M11 2L9 0.5M11 2L9 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const PlayIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11.14-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
);

export const StarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
    </svg>
);

export const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

export const FilterIcon = () => (
    <svg width="9" height="9" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.8333 1.16667H1.16667L5.83333 6.69083V10.5L8.16667 11.6667V6.69083L12.8333 1.16667Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const SubjectIcons = {
    all: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
    math: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="5" y1="5" x2="19" y2="19" /></svg>,
    physics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></svg>,
    chemistry: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v7l5 8H4l5-8V3z" /><line x1="9" y1="3" x2="15" y2="3" /></svg>,
    english: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    science: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z" /><line x1="2" y1="12" x2="22" y2="12" /></svg>,
    language: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>,
    art: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9.6-10-9.6z" /></svg>,
    it_tech: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14" y1="4" x2="10" y2="20" /></svg>,
};

const normalizeName = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Map tên môn (từ API) → icon phù hợp; không khớp thì dùng icon mặc định (sách).
export const subjectIcon = (name: string): ReactNode => {
    const n = normalizeName(name);
    if (n.includes("toan")) return SubjectIcons.math;
    if (n.includes("vat ly")) return SubjectIcons.physics;
    if (n.includes("hoa hoc")) return SubjectIcons.chemistry;
    if (n.includes("anh") || n.includes("ielts") || n.includes("toeic") || n.includes("toefl")) return SubjectIcons.english;
    if (n.includes("sinh")) return SubjectIcons.science;
    if (n.includes("tin hoc") || n.includes("lap trinh") || n.includes("cong nghe")) return SubjectIcons.it_tech;
    if (n.includes("nhac") || n.includes("my thuat") || n.includes("nghe thuat") || n.includes("hoi hoa")) return SubjectIcons.art;
    if (n.includes("phap") || n.includes("nhat") || n.includes("han") || n.includes("trung") || n.includes("ngoai ngu")) return SubjectIcons.language;
    return SubjectIcons.all;
};

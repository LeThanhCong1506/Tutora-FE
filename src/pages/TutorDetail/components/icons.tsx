export const PlayIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.667 9.333L19.334 14L11.667 18.667V9.333Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const StarIcon = ({ filled = true }: { filled?: boolean }) => (
    <svg width="10.5" height="10.5" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M5.5 1L6.939 3.915L10 4.365L7.75 6.555L8.378 9.6L5.5 8.085L2.622 9.6L3.25 6.555L1 4.365L4.061 3.915L5.5 1Z"
            fill={filled ? "#D4B483" : "none"}
            stroke="#D4B483"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const HeartIcon = () => (
    <svg width="17.5" height="17.5" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.75 3.375C14.85 2.475 13.65 2.025 12.375 2.025C11.1 2.025 9.9 2.475 9 3.375L8.25 4.125L7.5 3.375C5.625 1.5 2.625 1.5 0.75 3.375C-1.125 5.25 -1.125 8.25 0.75 10.125L8.25 17.625L15.75 10.125C17.625 8.25 17.625 5.25 15.75 3.375Z" fill="white" />
    </svg>
);

export const CheckIcon = () => (
    <svg width="8.8" height="8.8" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 2.25L3.5625 6.1875L1.5 4.125" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const CertificateIcon = () => (
    <svg width="17.5" height="17.5" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H4C2.9 2 2 2.9 2 4V14C2 15.1 2.9 16 4 16H14C15.1 16 16 15.1 16 14V4C16 2.9 15.1 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const VerifyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4L5.5 10.5L2 7" stroke="#3D4A3E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const QuoteIcon = () => (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="5" y="32" fontSize="36" fontFamily="Georgia, serif" fill="#E4DED5">"</text>
    </svg>
);

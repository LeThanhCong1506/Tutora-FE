import React from 'react';

export interface TourWelcomePromptProps {
    emoji?: string;
    title: string;
    description: string;
    acceptLabel?: string;
    skipLabel?: string;
    onAccept: () => void;
    onSkip: () => void;
}

/**
 * Modal chào mừng lần đầu ghé dashboard — hỏi có muốn chạy tour giới thiệu ngay không.
 * Dùng chung cho cả 3 portal (Tutor/Parent/Student), chỉ khác nội dung chữ.
 */
const TourWelcomePrompt: React.FC<TourWelcomePromptProps> = ({
    emoji = '👋',
    title,
    description,
    acceptLabel = 'Bắt đầu khám phá ✨',
    skipLabel = 'Bỏ qua',
    onAccept,
    onSkip,
}) => {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99998,
                background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                style={{
                    background: '#fff', borderRadius: 20, padding: '40px 36px',
                    maxWidth: 420, width: '90%', textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
            >
                <div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
                <h2
                    style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontSize: 22, fontWeight: 700, color: '#1a2238',
                        margin: '0 0 12px',
                    }}
                >
                    {title}
                </h2>
                <p
                    style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 15, color: 'rgba(62,47,40,0.7)',
                        lineHeight: 1.6, margin: '0 0 28px',
                    }}
                >
                    {description}
                </p>
                <button
                    onClick={onAccept}
                    style={{
                        display: 'block', width: '100%', padding: '14px 20px',
                        border: 'none', borderRadius: 12, background: '#1a2238',
                        color: '#fff', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', marginBottom: 12,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                >
                    {acceptLabel}
                </button>
                <button
                    onClick={onSkip}
                    style={{
                        display: 'block', width: '100%', padding: '12px 20px',
                        border: 'none', borderRadius: 12, background: 'transparent',
                        color: 'rgba(62,47,40,0.5)', fontSize: 14, fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                >
                    {skipLabel}
                </button>
            </div>
        </div>
    );
};

export default TourWelcomePrompt;

import type { CSSProperties } from "react";

export const pageHeader: CSSProperties = {
    marginBottom: 28,
};

export const pageTitle: CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: "#1a2238",
    margin: "0 0 4px",
    fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
};

export const pageSubtitle: CSSProperties = {
    fontSize: 14,
    color: "#737373",
    margin: 0,
};

export const avatarImg: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
};

export const avatarInitials: CSSProperties = {
    color: "#f2f0e4",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 1,
};

export const profileMeta: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

export const profileName: CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a2238",
    margin: 0,
};

export const roleBadge: CSSProperties = {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    color: "#6366f1",
    background: "#eef2ff",
    padding: "2px 8px",
    borderRadius: 4,
    letterSpacing: 0.5,
    width: "fit-content",
};

export const memberSince: CSSProperties = {
    fontSize: 12,
    color: "#9ca3af",
    margin: 0,
};

export const editBtn: CSSProperties = {
    padding: "8px 20px",
    background: "#1a2238",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
};

export const sectionHeader: CSSProperties = {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #f5f5f5",
};

export const sectionTitle: CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a2238",
    margin: 0,
};

export const noteIconWrap: CSSProperties = {
    flexShrink: 0,
    marginTop: 1,
};

export const noteText: CSSProperties = {
    fontSize: 13,
    color: "#4c4c7f",
    margin: 0,
    lineHeight: 1.6,
};

export const fieldGroup: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

export const fieldLabel: CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 0.5,
};

export const fieldValue: CSSProperties = {
    fontSize: 15,
    color: "#1a2238",
    margin: 0,
    fontWeight: 500,
};

export const fieldInput: CSSProperties = {
    fontSize: 14,
    color: "#1a2238",
    border: "1.5px solid #e5e5e5",
    borderRadius: 8,
    padding: "9px 12px",
    outline: "none",
    background: "#fafafa",
    fontFamily: "'IBM Plex Sans', sans-serif",
    width: "100%",
    boxSizing: "border-box",
};

export const readOnlyHint: CSSProperties = {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
};

export const actionRow: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 24,
    paddingTop: 20,
    borderTop: "1px solid #f5f5f5",
    gridColumn: "1 / -1",
};

export const cancelBtn: CSSProperties = {
    padding: "9px 20px",
    border: "1px solid #e5e5e5",
    background: "#fff",
    borderRadius: 8,
    fontSize: 13,
    color: "#737373",
    fontWeight: 500,
    cursor: "pointer",
};

export const saveBtn: CSSProperties = {
    padding: "9px 24px",
    background: "#1a2238",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
};

export const disabledStyle: CSSProperties = {
    opacity: 0.6,
    cursor: "not-allowed",
};

export const toggleBtn: CSSProperties = {
    padding: "7px 16px",
    border: "1px solid #e5e5e5",
    background: "#fff",
    borderRadius: 8,
    fontSize: 13,
    color: "#525252",
    fontWeight: 500,
    cursor: "pointer",
};

export const eyeBtn: CSSProperties = {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    color: "#9ca3af",
};

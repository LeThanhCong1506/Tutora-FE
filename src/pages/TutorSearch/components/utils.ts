import type { TutorSearchResultResponse } from "../../../services/tutorSearch.service";
import type { Tutor, TutorType } from "./types";

export const mapSubscriptionToType = (sub: string | null | undefined): TutorType => {
    const map: Record<string, TutorType> = {
        intensive: "intensive",
        guided: "guided",
        basic: "basic",
        free: "basic",
        elite: "elite",
    };
    return map[(sub || "").toLowerCase()] || "basic";
};

export const getResultType = (type: TutorType): "success" | "primary" | "muted" | "warning" => {
    const map: Record<TutorType, "success" | "primary" | "muted" | "warning"> = {
        intensive: "success",
        guided: "primary",
        basic: "muted",
        elite: "warning",
    };
    return map[type];
};

export const formatGradeLevel = (grade: string): string => {
    const match = grade.match(/^Grade_(\d+)$/i);
    if (match) return `Lớp ${match[1]}`;
    return grade;
};

export const formatGradeLevelRanges = (grades: string[]): string => {
    if (grades.length === 0) return "";

    const nums = grades.map(g => {
        const m = g.match(/\d+/);
        return m ? parseInt(m[0]) : 0;
    }).filter(n => n > 0).sort((a, b) => a - b);

    if (nums.length === 0) return "";

    const ranges: string[] = [];
    let start = nums[0];
    let end = nums[0];

    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === end + 1) {
            end = nums[i];
        } else {
            ranges.push(start === end ? `${start}` : `${start}-${end}`);
            start = nums[i];
            end = nums[i];
        }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    return `Lớp ${ranges.join(", ")}`;
};

export const mapApiTutorToUi = (apiTutor: TutorSearchResultResponse): Tutor => {
    const type = mapSubscriptionToType(apiTutor.subscriptionType);

    const subjects: string[] = [];
    const gradeLevelSet = new Set<string>();
    if (apiTutor.subjects) {
        apiTutor.subjects.forEach((s) => {
            if (s.subjectName && !subjects.includes(s.subjectName)) {
                subjects.push(s.subjectName);
            }
            if (s.gradeLevels) {
                s.gradeLevels.forEach((gl) => {
                    if (/^Grade_(\d+)$/i.test(gl)) {
                        const num = parseInt(gl.match(/^Grade_(\d+)$/i)![1]);
                        if (num >= 1 && num <= 12) {
                            gradeLevelSet.add(gl);
                        }
                    }
                });
            }
        });
    }

    const sortedGradeLevels = Array.from(gradeLevelSet)
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)![0]);
            const numB = parseInt(b.match(/\d+/)![0]);
            return numA - numB;
        })
        .map(formatGradeLevel);

    return {
        id: apiTutor.tutorId,
        name: apiTutor.fullName || "Gia sư",
        avatar: apiTutor.avatarUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
        type,
        credential: apiTutor.degreeLevel || "",
        rating: apiTutor.averageRating || 0,
        university: apiTutor.education || "",
        subjects: subjects.length > 0 ? subjects : ["Chưa cập nhật"],
        gradeLevels: sortedGradeLevels,
        experience: apiTutor.yearsOfExperience ? `${apiTutor.yearsOfExperience} Năm` : "N/A",
        result: apiTutor.successRate || apiTutor.specialty || "—",
        resultType: getResultType(type),
        highlights: apiTutor.highlights || [],
        price: apiTutor.hourlyRate ? Math.round(Number(apiTutor.hourlyRate) * 1.05) : 0,
        trialLessonPrice: apiTutor.trialLessonPrice ?? null,
        allowPriceNegotiation: apiTutor.allowPriceNegotiation ?? false,
    };
};

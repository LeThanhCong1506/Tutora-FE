import { useState, useCallback } from "react";
import { validatePromotion } from "../../../../services/booking.service";
import type { PromotionValidateResult } from "../../../../services/booking.service";

/**
 * Manage promotion-code validation state for a booking estimate.
 * Computes discount amount based on percentage/fixed type and max cap.
 */
export function usePromotion(estimatedPrice: number) {
    const [promoResult, setPromoResult] = useState<PromotionValidateResult | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoDiscount, setPromoDiscount] = useState(0);

    const validate = useCallback(async (code: string) => {
        if (!code) return;
        setPromoLoading(true);
        try {
            const response = await validatePromotion(code, estimatedPrice);
            const result = response.content;
            setPromoResult(result);
            if (result.valid) {
                if ((result.discountType === "percentage" || result.discountType === "percent") && result.discountValue) {
                    let calcDiscount = estimatedPrice * (result.discountValue / 100);
                    if (result.maxDiscountAmount && calcDiscount > result.maxDiscountAmount) {
                        calcDiscount = result.maxDiscountAmount;
                    }
                    setPromoDiscount(calcDiscount);
                } else if (result.discountType === "fixed" && result.discountValue) {
                    setPromoDiscount(result.discountValue);
                }
            } else {
                setPromoDiscount(0);
            }
        } catch (err: any) {
            console.error("validatePromotion failed:", err);
            const msg = err.response?.data?.message || "Không thể kiểm tra mã khuyến mãi";
            setPromoResult({ valid: false, message: msg });
        } finally {
            setPromoLoading(false);
        }
    }, [estimatedPrice]);

    const reset = useCallback(() => {
        setPromoResult(null);
        setPromoDiscount(0);
    }, []);

    return { promoResult, promoLoading, promoDiscount, validate, reset };
}

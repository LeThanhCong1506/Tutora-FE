import React, { useState, useEffect, useCallback, useRef } from 'react';
import './TutorTour.css';

export interface TourStep {
    target: string;       // CSS selector for the element to highlight
    title: string;        // Step title
    description: string;  // Step description
    placement?: 'top' | 'right' | 'bottom' | 'left'; // Tooltip position relative to target
}

interface TutorTourProps {
    steps: TourStep[];
    onComplete: () => void;
    onSidebarOpen?: () => void;
    onSidebarClose?: () => void;
}

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 16;

const TutorTour: React.FC<TutorTourProps> = ({ steps, onComplete, onSidebarOpen, onSidebarClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const retryRef = useRef<number>(0);

    const step = steps[currentStep];

    // Position the tooltip relative to the target rect
    const positionTooltip = useCallback((rect: TargetRect, placement: string) => {
        // Wait a tick for the tooltip to render, then measure it
        const doPosition = () => {
            const tooltip = tooltipRef.current;
            const isMobile = window.innerWidth <= 1024;
            // On mobile, limit tooltip width
            const maxTw = isMobile ? window.innerWidth - 20 : 340;
            // Fallback tooltip size if ref not ready yet
            let tw = tooltip ? tooltip.offsetWidth : 340;
            if (tw > maxTw) tw = maxTw;
            const th = tooltip ? tooltip.offsetHeight : 180;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let top = 0;
            let left = 0;

            switch (placement) {
                case 'right':
                    left = rect.left + rect.width + TOOLTIP_GAP;
                    top = rect.top + rect.height / 2 - th / 2;
                    // Overflow right → fall to bottom
                    if (left + tw > vw - 20) {
                        left = Math.max(20, rect.left + rect.width / 2 - tw / 2);
                        top = rect.top + rect.height + TOOLTIP_GAP;
                    }
                    break;
                case 'left':
                    left = rect.left - tw - TOOLTIP_GAP;
                    top = rect.top + rect.height / 2 - th / 2;
                    if (left < 20) {
                        left = Math.max(20, rect.left + rect.width / 2 - tw / 2);
                        top = rect.top + rect.height + TOOLTIP_GAP;
                    }
                    break;
                case 'bottom':
                    left = Math.max(20, rect.left + rect.width / 2 - tw / 2);
                    top = rect.top + rect.height + TOOLTIP_GAP;
                    // If tooltip would overflow below viewport, flip to ABOVE the target
                    if (top + th > vh - 10) {
                        const topAbove = rect.top - th - TOOLTIP_GAP;
                        if (topAbove >= 10) {
                            top = topAbove;
                        }
                        // else keep bottom and let clamp handle it
                    }
                    break;
                case 'top':
                    left = Math.max(20, rect.left + rect.width / 2 - tw / 2);
                    top = rect.top - th - TOOLTIP_GAP;
                    if (top < 20) {
                        top = rect.top + rect.height + TOOLTIP_GAP;
                    }
                    break;
            }

            // Clamp to viewport
            if (top < 10) top = 10;
            if (top + th > vh - 10) top = vh - th - 10;
            if (left < 10) left = 10;
            if (left + tw > vw - 10) left = vw - tw - 10;

            // On mobile with sidebar open, ensure tooltip doesn't clip behind sidebar
            if (isMobile && rect.left < 290) {
                // Target is a sidebar item — position tooltip starting from right of sidebar
                left = Math.max(10, Math.min(left, vw - tw - 10));
            }

            setTooltipPos({ top, left });

            // On mobile, set max-width on tooltip element
            if (tooltip && isMobile) {
                tooltip.style.maxWidth = `${vw - 20}px`;
            }
        };

        // Double rAF to ensure DOM has painted
        requestAnimationFrame(() => {
            requestAnimationFrame(doPosition);
        });
    }, []);

    // Find the nearest scrollable ancestor
    const findScrollParent = (el: Element): Element | null => {
        let parent = el.parentElement;
        while (parent) {
            const style = getComputedStyle(parent);
            if (
                style.overflow === 'auto' || style.overflow === 'scroll' ||
                style.overflowY === 'auto' || style.overflowY === 'scroll'
            ) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    };

    // Main: highlight target and position tooltip
    const highlightStep = useCallback(() => {
        if (!step) return;

        // Last step: farewell modal — no element to highlight
        const isLast = currentStep === steps.length - 1;
        if (isLast) {
            const isMobile = window.innerWidth <= 1024;
            if (isMobile && onSidebarClose) onSidebarClose();
            setTargetRect(null); // No spotlight
            setIsVisible(true);
            return;
        }

        const isMobile = window.innerWidth <= 1024;
        const isSidebarTarget = step.target.includes('sidebar') || step.target.includes('nav-');

        // On mobile, toggle sidebar visibility based on target
        if (isMobile && isSidebarTarget && onSidebarOpen) {
            onSidebarOpen();
            // Wait for sidebar animation to finish before measuring
            setTimeout(() => findAndHighlight(step), 500);
            return;
        } else if (isMobile && !isSidebarTarget && onSidebarClose) {
            onSidebarClose();
            setTimeout(() => findAndHighlight(step), 350);
            return;
        }

        findAndHighlight(step);
    }, [step, currentStep, steps.length, onComplete, positionTooltip, onSidebarOpen, onSidebarClose]);

    // Extracted highlight logic
    const findAndHighlight = useCallback((stepToHighlight: TourStep) => {
        const el = document.querySelector(stepToHighlight.target);
        if (!el) {
            // Element not found — skip
            if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                onComplete();
            }
            return;
        }

        // Check if element is inside a sticky/fixed parent
        const elStyle = getComputedStyle(el as HTMLElement);
        const parentStyle = el.parentElement ? getComputedStyle(el.parentElement) : null;
        const isSticky = elStyle.position === 'sticky' || elStyle.position === 'fixed' ||
                         parentStyle?.position === 'sticky' || parentStyle?.position === 'fixed';

        if (isSticky) {
            const scrollParent = findScrollParent(el);
            if (scrollParent) {
                scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Measure after scroll settles
        setTimeout(() => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            const newRect: TargetRect = {
                top: rect.top - PADDING,
                left: rect.left - PADDING,
                width: rect.width + PADDING * 2,
                height: rect.height + PADDING * 2,
            };
            setTargetRect(newRect);

            // On mobile, force tooltip placement to bottom for sidebar items
            const isMobile = window.innerWidth <= 1024;
            const placement = (isMobile && (stepToHighlight.placement === 'right' || stepToHighlight.placement === 'left'))
                ? 'bottom'
                : (stepToHighlight.placement || 'right');

            positionTooltip(newRect, placement);
            setIsVisible(true);
        }, 350);
    }, [currentStep, steps.length, onComplete, positionTooltip]);

    // Re-highlight on step change
    useEffect(() => {
        setIsVisible(false);
        setTargetRect(null);
        setTooltipPos({ top: -9999, left: -9999 });
        retryRef.current = 0;
        const timer = setTimeout(highlightStep, 150);
        return () => clearTimeout(timer);
    }, [currentStep, highlightStep]);

    // Re-position on window resize
    useEffect(() => {
        const handleResize = () => {
            if (targetRect && step) {
                const el = document.querySelector(step.target);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const newRect: TargetRect = {
                        top: rect.top - PADDING,
                        left: rect.left - PADDING,
                        width: rect.width + PADDING * 2,
                        height: rect.height + PADDING * 2,
                    };
                    setTargetRect(newRect);
                    positionTooltip(newRect, step.placement || 'right');
                }
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [targetRect, step, positionTooltip]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const isLastStep = currentStep === steps.length - 1;

    // Always render — use opacity to hide during transitions
    return (
        <div className={`tutor-tour-overlay ${isVisible ? 'tutor-tour-visible' : ''}`}>
            {/* SVG mask with cutout */}
            <svg className="tutor-tour-mask" width="100%" height="100%">
                <defs>
                    <mask id="tutor-tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left}
                                y={targetRect.top}
                                width={targetRect.width}
                                height={targetRect.height}
                                rx={12}
                                ry={12}
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.65)"
                    mask="url(#tutor-tour-mask)"
                />
            </svg>

            {/* Spotlight glow */}
            {targetRect && (
                <div
                    className="tutor-tour-spotlight"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                    }}
                />
            )}

            {/* Tooltip — always rendered to allow ref measurement */}
            {isLastStep ? (
                /* Final step: centered modal like the welcome prompt */
                <div
                    className={`tutor-tour-final-modal ${isVisible ? 'tutor-tour-final-modal-visible' : ''}`}
                >
                    <h3 className="tutor-tour-title">{step?.title}</h3>
                    <p className="tutor-tour-description">{step?.description}</p>
                    <button className="tutor-tour-next-btn" onClick={handleNext}>
                        Hoàn tất! 🎉
                    </button>
                </div>
            ) : (
                <div
                    ref={tooltipRef}
                    className={`tutor-tour-tooltip ${isVisible ? 'tutor-tour-tooltip-visible' : ''} ${step && (step.target.includes('sidebar') || step.target.includes('nav-')) ? 'tutor-tour-tooltip-light' : ''}`}
                    style={{
                        position: 'fixed',
                        top: tooltipPos.top,
                        left: tooltipPos.left,
                    }}
                >
                    <div className="tutor-tour-step-counter">
                        {currentStep + 1} / {steps.length - 1}
                    </div>
                    <h3 className="tutor-tour-title">{step?.title}</h3>
                    <p className="tutor-tour-description">{step?.description}</p>
                    <button className="tutor-tour-next-btn" onClick={handleNext}>
                        Tiếp tục →
                    </button>
                </div>
            )}
        </div>
    );
};

export default TutorTour;

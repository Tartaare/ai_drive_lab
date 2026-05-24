export type EasingFunction = (t: number) => number;

export const EasingFunctions = {
    easeOut: (t: number): number => {
        return 1 - Math.pow(1 - t, 4);
    },
    linear: (t: number): number => {
        return t;
    },
    easeIn: (t: number): number => {
        return t * t;
    },
    easeInOut: (t: number): number => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
};

export default class NumberAnimator {
    private element: HTMLElement;
    private startValue: number;
    private endValue: number;
    private duration: number;
    private delay: number;
    private easing: EasingFunction;
    private startTime: number | null = null;
    private animationId: number | null = null;

    constructor(
        element: HTMLElement,
        startValue: number,
        endValue: number,
        duration: number,
        delay: number,
        easing: EasingFunction
    ) {
        this.element = element;
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = duration;
        this.delay = delay;
        this.easing = easing;
    }

    public start(): void {
        if (this.delay > 0) {
            setTimeout(() => {
                this.startTime = performance.now();
                this.animate();
            }, this.delay);
        } else {
            this.startTime = performance.now();
            this.animate();
        }
    }

    private animate = (): void => {
        if (this.startTime === null) return;

        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        
        const easedProgress = this.easing(progress);
        const currentValue = this.startValue + (this.endValue - this.startValue) * easedProgress;
        
        this.element.textContent = Math.round(currentValue).toString();

        if (progress < 1) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            this.dispose();
        }
    };

    public dispose(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

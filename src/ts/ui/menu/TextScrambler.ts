export class TextScrambler {
    private static readonly CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    private readonly element: HTMLElement;
    private readonly reducedMotion: boolean;
    private frame = 0;
    private animationFrame = 0;
    private targetText = '';
    private isRunning = false;

    constructor(element: HTMLElement) {
        this.element = element;
        this.reducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    public start(targetText: string): void {
        this.targetText = targetText;
        this.frame = 0;
        if (this.reducedMotion) {
            this.element.textContent = targetText;
            return;
        }
        this.isRunning = true;
        this.tick();
    }

    public stop(): void {
        this.isRunning = false;
        cancelAnimationFrame(this.animationFrame);
        this.revealFinalText(0);
    }

    private tick = (): void => {
        if (!this.isRunning) return;
        this.frame += 1;
        this.element.textContent = this.buildScrambledFrame();
        this.animationFrame = requestAnimationFrame(this.tick);
    };

    private revealFinalText(step: number): void {
        const revealCount = Math.min(this.targetText.length, step);
        const remaining = this.targetText.length - revealCount;
        if (remaining <= 0) {
            this.element.textContent = this.targetText;
            return;
        }
        this.element.textContent =
            this.targetText.slice(0, revealCount) +
            this.randomChars(remaining);
        this.animationFrame = requestAnimationFrame(() => this.revealFinalText(step + 2));
    }

    private buildScrambledFrame(): string {
        if (!this.targetText) return '';
        const windowSize = Math.max(2, Math.min(5, Math.ceil(this.targetText.length / 4)));
        const offset = this.frame % (this.targetText.length + windowSize);
        let value = '';
        for (let index = 0; index < this.targetText.length; index += 1) {
            const char = this.targetText.charAt(index);
            if (/\s/.test(char)) {
                value += char;
                continue;
            }
            const isSettled = index < offset - windowSize;
            value += isSettled ? char : this.randomChar(char);
        }
        return value;
    }

    private randomChars(length: number): string {
        let value = '';
        for (let index = 0; index < length; index += 1) {
            value += this.randomChar(this.targetText.charAt(index));
        }
        return value;
    }

    private randomChar(sourceChar: string): string {
        if (/[^A-Za-z0-9]/.test(sourceChar)) return sourceChar;
        const chars = TextScrambler.CHARSET;
        return chars.charAt(Math.floor(Math.random() * chars.length));
    }
}

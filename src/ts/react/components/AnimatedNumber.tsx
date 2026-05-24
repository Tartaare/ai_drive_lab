import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    className?: string;
}

export function AnimatedNumber({ value, duration = 400, className }: AnimatedNumberProps): JSX.Element {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        if (displayValue !== value) {
            const startTime = performance.now();
            const startValue = displayValue;
            const endValue = value;
            const distance = endValue - startValue;

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function pour une animation fluide
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const currentValue = Math.round(startValue + distance * easeOutQuart);
                
                setDisplayValue(currentValue);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [value, duration, displayValue]);

    return (
        <span className={className}>
            {displayValue}
        </span>
    );
}

import { CSSProperties, useEffect, useState } from 'react';

interface AnimatedStatBarProps {
    value: number;
    maxValue: number;
    previousValue?: number;
    duration?: number;
    className?: string;
}

export function AnimatedStatBar({ 
    value, 
    maxValue, 
    previousValue, 
    duration = 400, 
    className 
}: AnimatedStatBarProps): JSX.Element {
    const [currentRatio, setCurrentRatio] = useState(() => Math.min(value / maxValue, 1));
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const targetRatio = Math.min(value / maxValue, 1);
        
        if (currentRatio !== targetRatio) {
            setIsAnimating(true);
            const startTime = performance.now();
            const startRatio = currentRatio;
            const distance = targetRatio - startRatio;

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function pour une animation fluide
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const newRatio = startRatio + distance * easeOutQuart;
                
                setCurrentRatio(newRatio);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setIsAnimating(false);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [value, maxValue, duration, currentRatio]);

    const style: CSSProperties = {
        '--bar-ratio': currentRatio.toFixed(3)
    } as CSSProperties;

    return (
        <span 
            className={`vehicle-stat__bar ${isAnimating ? 'vehicle-stat__bar--animating' : ''} ${className || ''}`}
            style={style}
        >
            <span className="vehicle-stat__bar__fill" />
        </span>
    );
}

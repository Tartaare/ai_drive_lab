import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
    size?: number;
    strokeWidth?: number;
};

export function X({ size = 24, strokeWidth = 2, ...props }: IconProps): JSX.Element {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

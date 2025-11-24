import React, { useEffect, useState } from 'react';
import './PageTransition.css';

interface PageTransitionProps {
    children: React.ReactNode;
    transitionKey?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, transitionKey }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Reset animation when key changes
        setIsVisible(false);
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 50);

        return () => clearTimeout(timer);
    }, [transitionKey]);

    return (
        <div className={`page-transition ${isVisible ? 'page-transition-enter' : ''}`}>
            {children}
        </div>
    );
};

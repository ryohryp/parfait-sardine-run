import React, { useEffect } from 'react';
import { useSound } from '../../hooks/useSound';
import './ModalWrapper.css';

interface ModalWrapperProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ visible, onClose, children, title }) => {
    const { playClick } = useSound();

    useEffect(() => {
        if (visible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [visible]);

    if (!visible) return null;

    return (
        <div className="modal-wrapper-overlay" onClick={onClose}>
            <div className="modal-wrapper-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-wrapper-header">
                    {title && <h2>{title}</h2>}
                    <button className="modal-close-btn" onClick={() => { playClick(); onClose(); }}>
                        ×
                    </button>
                </div>
                <div className="modal-wrapper-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

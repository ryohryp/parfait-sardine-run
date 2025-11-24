import { useState } from 'react';

const FINGERPRINT_KEY = 'psrun_user_fingerprint';

export function useFingerprint() {
    const [fingerprint] = useState<string>(() => {
        // Initialize synchronously to ensure a value is always available
        let fp = localStorage.getItem(FINGERPRINT_KEY);
        if (!fp) {
            // Fallback for environments where crypto.randomUUID might be missing (though unlikely in modern browsers)
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                fp = crypto.randomUUID();
            } else {
                fp = 'fp-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            }
            localStorage.setItem(FINGERPRINT_KEY, fp);
        }
        return fp;
    });

    return fingerprint;
}

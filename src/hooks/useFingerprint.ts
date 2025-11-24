import { useState, useEffect } from 'react';

const FINGERPRINT_KEY = 'psrun_user_fingerprint';

export function useFingerprint() {
    const [fingerprint, setFingerprint] = useState<string>('');

    useEffect(() => {
        let fp = localStorage.getItem(FINGERPRINT_KEY);
        if (!fp) {
            fp = crypto.randomUUID();
            localStorage.setItem(FINGERPRINT_KEY, fp);
        }
        setFingerprint(fp);
    }, []);

    return fingerprint;
}

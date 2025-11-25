export class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMuted: boolean = false;
    private volume: number = 0.5;

    private bgmAudio: HTMLAudioElement | null = null;
    private currentBgmUrl: string | null = null;

    private constructor() {
        // Initialize on user interaction usually, but we prepare structure here
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volume;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public setVolume(val: number) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        }
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.isMuted ? 0 : this.volume * 0.5;
        }
    }

    public toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        }
        if (this.bgmAudio) {
            this.bgmAudio.volume = this.isMuted ? 0 : this.volume * 0.5;
        }
        return this.isMuted;
    }

    // --- BGM Control ---

    public playBgm(url: string) {
        if (this.currentBgmUrl === url && this.bgmAudio && !this.bgmAudio.paused) {
            return; // Already playing same track
        }

        this.stopBgm();

        this.bgmAudio = new Audio(url);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = this.isMuted ? 0 : this.volume * 0.5; // BGM slightly lower volume

        this.bgmAudio.play().catch(e => {
            console.warn('BGM play failed (user interaction needed?)', e);
        });

        this.currentBgmUrl = url;
    }

    public stopBgm() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
            this.currentBgmUrl = null;
        }
    }

    private ensureContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // --- Synthesized Sounds ---

    /**
     * Play a coin/reward sound (High pitch ping)
     */
    public playCoin() {
        if (!this.audioContext || !this.masterGain) return;
        this.ensureContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        // Coin sound: High sine wave with quick decay
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    /**
     * Play an achievement unlock sound (Fanfare-like arpeggio)
     */
    public playAchievement() {
        if (!this.audioContext || !this.masterGain) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // Major chord arpeggio: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];

        notes.forEach((freq, i) => {
            const osc = this.audioContext!.createOscillator();
            const gain = this.audioContext!.createGain();

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = now + i * 0.1;
            const duration = 0.4;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }

    /**
     * Play a generic UI click sound
     */
    public playClick() {
        if (!this.audioContext || !this.masterGain) return;
        this.ensureContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    /**
     * Play a success/confirm sound
     */
    public playSuccess() {
        if (!this.audioContext || !this.masterGain) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108.73, now + 0.1); // C#6

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc1.start(now);
        osc1.stop(now + 0.2);

        osc2.start(now + 0.1);
        osc2.stop(now + 0.4);
    }

    /**
     * Play Ultra Rare Gacha Sound
     * Dramatic fanfare with sparkles
     */
    public playUltraRare() {
        if (!this.audioContext || !this.masterGain) return;
        this.ensureContext();

        const now = this.audioContext.currentTime;

        // 1. Deep Bass Impact
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(100, now);
        bassOsc.frequency.exponentialRampToValueAtTime(50, now + 1.0);

        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        bassOsc.start(now);
        bassOsc.stop(now + 1.5);

        // 2. Magical Arpeggio (Rapid high notes)
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00]; // C major extended

        notes.forEach((freq, i) => {
            // Play ascending
            const osc = this.audioContext!.createOscillator();
            const gain = this.audioContext!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + 0.1 + (i * 0.08);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });

        // 3. Final Chord (Fanfare)
        const chordNotes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        const chordTime = now + 0.8;

        chordNotes.forEach(freq => {
            const osc = this.audioContext!.createOscillator();
            const gain = this.audioContext!.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, chordTime);
            gain.gain.linearRampToValueAtTime(0.3, chordTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, chordTime + 2.0);

            osc.start(chordTime);
            osc.stop(chordTime + 2.0);
        });
    }
}

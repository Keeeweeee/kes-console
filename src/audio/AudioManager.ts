// Centralized Audio Manager

export type MusicType = 'dashboard' | 'game';
export type SFXType = 'gameOver' | 'youWin';

const MUSIC_MAP: Record<MusicType, string> = {
  dashboard: 'music/dashboard.mp3',
  game: 'music/game.mp3',
};
const GAMEOVER_SFX_MAP: Record<string, string> = {
  snake: 'music/game-over.mp3',
  pacman: 'music/pac-man.mp3',
  'block-breaker': 'music/game-over.mp3',
  minesweeper: 'music/explosion.mp3',
};

const YOU_WIN_SFX_PATH = 'music/you-win.mp3';

class AudioManager {
  private static instance: AudioManager;
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicType: MusicType | null = null;
  private pendingMusicType: MusicType | null = null;
  private musicVolume = 0.12;
  private sfxVolume = 0.3;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    const enableAudio = () => {
      this.isInitialized = true;

      if (this.pendingMusicType) {
        this.playMusic(this.pendingMusicType);
        this.pendingMusicType = null;
      }

      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
  }

  playMusic(type: MusicType): void {
    if (!this.isInitialized) {
      this.pendingMusicType = type;
      return;
    }

    if (
      this.currentMusicType === type &&
      this.currentMusic &&
      !this.currentMusic.paused
    ) {
      return;
    }

    this.stopMusic();

    const musicPath = MUSIC_MAP[type];
    this.currentMusic = new Audio(musicPath);
    this.currentMusic.loop = true;
    this.currentMusic.volume = this.musicVolume;
    this.currentMusicType = type;

    this.currentMusic.play().catch(() => {});
  }

  stopMusic(): void {
    if (!this.currentMusic) return;

    this.currentMusic.pause();
    this.currentMusic.currentTime = 0;
    this.currentMusic = null;
    this.currentMusicType = null;
  }

  playSFX(type: SFXType, gameId?: string): void {
    if (!this.isInitialized) return;

    let sfxPath: string | undefined;

    if (type === 'youWin') {
      sfxPath = YOU_WIN_SFX_PATH;
    }

    if (type === 'gameOver' && gameId) {
      sfxPath = GAMEOVER_SFX_MAP[gameId];
    }

    if (!sfxPath) return;

    const sfx = new Audio(sfxPath);
    sfx.volume = this.sfxVolume;

    sfx.play().catch(() => {});
    sfx.addEventListener('ended', () => sfx.remove());
  }


  fadeOutMusic(duration = 1000): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentMusic) return resolve();

      const step = this.currentMusic.volume / (duration / 50);
      const interval = setInterval(() => {
        if (!this.currentMusic) {
          clearInterval(interval);
          resolve();
          return;
        }

        this.currentMusic.volume = Math.max(
          0,
          this.currentMusic.volume - step
        );

        if (this.currentMusic.volume === 0) {
          this.stopMusic();
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
}

export default AudioManager;

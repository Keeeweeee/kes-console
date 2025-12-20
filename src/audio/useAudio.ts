import { useEffect, useRef } from 'react';
import AudioManager, { MusicType, SFXType } from './AudioManager';

export const useAudio = () => {
  const audioManager = useRef(AudioManager.getInstance());

  useEffect(() => {
    audioManager.current.initialize();
  }, []);

  return {
    playMusic: (type: MusicType) =>
      audioManager.current.playMusic(type),
    stopMusic: () =>
      audioManager.current.stopMusic(),
    fadeOutMusic: (duration?: number) =>
      audioManager.current.fadeOutMusic(duration),
    playSFX: (type: SFXType, gameId?: string) =>
      audioManager.current.playSFX(type, gameId),
    setMusicVolume: (v: number) =>
      audioManager.current.setMusicVolume(v),
    setSFXVolume: (v: number) =>
      audioManager.current.setSFXVolume(v),
  };
};

export default useAudio;

'use client';
import type {useGameSounds} from '@/lib/use-game-sounds';
export default function DisplaySoundControls({sound}:{sound:ReturnType<typeof useGameSounds>}){
 return <div className="display-sound-controls">
  <button className="icon-button" aria-label={sound.enabled?'Mute game sounds':'Enable game sounds'} aria-pressed={sound.enabled} onClick={()=>void sound.toggle()}>{sound.enabled?'♪ Sound on':'♪ Sound off'}</button>
  <details className="display-sound-options"><summary className="icon-button">Sound options</summary><div className="display-sound-menu">
   <label htmlFor="display-sound-volume">Volume <output>{Math.round(sound.volume*100)}%</output></label><input id="display-sound-volume" type="range" min="0" max="100" step="5" value={Math.round(sound.volume*100)} onChange={e=>sound.setVolume(Number(e.target.value)/100)}/>
   <button className="button ghost full" disabled={!sound.previewAvailable} onClick={()=>void sound.preview()}>Preview final countdown ♪</button>
   <a className="button ghost full" href="/sounds/congress-game-sounds.zip" download>Download sound pack ↓</a>
   <p>Ticks follow the game timer, with faster ticks in the last five seconds. Sounds play on this screen.</p>{sound.error&&<p className="sound-error" role="alert">{sound.error}</p>}
  </div></details>
 </div>;
}

// Local synthesized air and quiet tones; no recordings or network requests.
export class Soundscape {
  constructor(){this.enabled=false;this.ctx=null;}
  async start(){
    if(!this.enabled)return;
    try{
      if(!this.ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.18;this.master.connect(this.ctx.destination);
        this.drone=this.ctx.createOscillator();this.drone.frequency.value=53;this.droneGain=this.ctx.createGain();this.droneGain.gain.value=0;
        this.drone.connect(this.droneGain).connect(this.master);this.drone.start();
        const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate),data=buffer.getChannelData(0);
        let sample=0;for(let i=0;i<data.length;i++){sample=(sample+(Math.random()*2-1)*.035)/1.02;data[i]=sample*4;}
        this.wind=this.ctx.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;
        this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=600;
        this.air=this.ctx.createGain();this.air.gain.value=0;this.wind.connect(this.filter).connect(this.air).connect(this.master);this.wind.start();
      }
      await this.ctx.resume();
    }catch{/* Silent playback remains available. */}
  }
  toggle(){this.enabled=!this.enabled;if(this.master)this.master.gain.setTargetAtTime(this.enabled?.18:0,this.ctx.currentTime,.05);return this.enabled;}
  tone(freq,duration,volume){if(!this.ctx||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.frequency.value=freq;osc.connect(gain).connect(this.master);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.start(t);osc.stop(t+duration+.02);
  }
  light(){this.tone(130,.23,.04);}
  chime(){this.tone(220,1.4,.075);this.tone(330,1.9,.04);}
  update(speed,power,time,wing){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;
    this.droneGain.gain.setTargetAtTime(power*(.025+speed*.035),t,.15);
    this.air.gain.setTargetAtTime(speed*.62+wing*.08*(.5+.5*Math.sin(time*7)),t,.08);
    this.filter.frequency.setTargetAtTime(350+speed*1300,t,.3);
  }
  pause(){this.ctx?.suspend().catch(()=>{});}
}

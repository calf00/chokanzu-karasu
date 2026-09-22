import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCrow, createFlightWings } from './crow.js';
import { createCity } from './city.js';
import { createGallery } from './gallery.js';
import { createGalleryControls } from './gallery-controls.js';
import { Soundscape } from './audio.js';
import { FLOOR_SOURCE, PHOTO_SOURCES, PHOTO_TITLES } from './gallery-assets.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const DURATION = 39.5, FLIGHT_START = 15.5, FLIGHT_END = 39.5;
const clamp = THREE.MathUtils.clamp;
const smooth = n => { const t=clamp(n,0,1); return t*t*(3-2*t); };
const mix = THREE.MathUtils.lerp;
const v = (x,y,z) => new THREE.Vector3(x,y,z);
const sound = new Soundscape();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,scene,camera,world,city,crow,wings,gallery,skyLight;
let ready=false,started=false,playing=false,time=0,lastFrame=0,lastChapter=-1,lastLight=-1;
let clean=false,currentPhoto=0,galleryControls,galleryTime=41;
const phaseTimes=[0,5,12,15.5,22,35,45];
const galleryOffset=v(0,88,-407.6);
const look=v(),position=v();


function fail(message){playing=false;sound.pause();$('error-detail').textContent=message;$('error').hidden=false;$('intro').hidden=true;}
function setClean(value){clean=value;$('experience').classList.toggle('is-clean',value);$('clean').setAttribute('aria-pressed',String(value));$('show-ui').hidden=!value;}
function updateControls(){
  $('pause').innerHTML=playing?'Ⅱ <span>一時停止</span>':time>=DURATION?'↺ <span>もう一度</span>':'▶ <span>再開</span>';
  $('pause').setAttribute('aria-label',playing?'一時停止':time>=DURATION?'もう一度再生':'再開');
  $('seek').value=time;$('seek').style.setProperty('--progress',`${time/DURATION*100}%`);
  const seconds=Math.floor(time);$('time').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} / 00:40`;
}
function setPlaying(value){
  playing=value;lastFrame=performance.now();
  if(playing)sound.start();else sound.pause();updateControls();
}
function start(){
  if(!ready)return;
  galleryControls.exit();$('gallery-controls').hidden=true;$('experience').classList.remove('is-gallery');
  started=true;time=0;lastChapter=-1;lastLight=-1;gallery.reset();
  $('intro').hidden=true;$('hud').hidden=false;$('playback').hidden=false;
  if($('lightbox').open)$('lightbox').close();
  $('scene').focus();setPlaying(true);renderAt(0);
}
function togglePlay(){if(!started||galleryControls?.active)return;if(time>=DURATION)start();else setPlaying(!playing);}

function renderAt(t){
  const light=smooth((t-.7)/4.1);
  world.update({lightProgress:light,visible:t<21});
  crow.root.visible=t<FLIGHT_START;
  crow.update({time:t,flight:0});
  city.update({time:t,reveal:1});
  const eye=crow.headTarget.clone().add(crow.root.position);
  let fov=58,bank=0,blink=0,wing=0,speed=0;
  if(t<5){
    position.set(0,1.65,9);look.set(0,1.65,-8);
  }else if(t<12){
    const k=smooth((t-5)/7);
    position.set(Math.sin(k*Math.PI)*.24,1.65+(reducedMotion?0:Math.sin(t*7)*.012*Math.sin(k*Math.PI)),mix(9,-3.45,k));
    look.copy(v(0,1.65,-8)).lerp(eye,smooth(k));
  }else if(t<FLIGHT_START){
    const k=smooth((t-12)/3.5);
    position.copy(v(0,1.65,-3.45)).lerp(eye.clone().add(v(0,.012,.055)),k);
    look.copy(eye);fov=mix(58,43,k);
    blink=smooth((t-14.6)/.9);
  }else if(t<FLIGHT_END){
    const k=clamp((t-FLIGHT_START)/(FLIGHT_END-FLIGHT_START),0,1);
    const u=smooth(k);
    position.copy(city.curve.getPointAt(u));
    const ahead=city.curve.getPointAt(Math.min(1,u+.016));
    if(u>.99)ahead.add(v(0,0,-4*smooth((u-.99)/.01)));
    look.copy(ahead);
    const tangent=city.curve.getTangentAt(u),next=city.curve.getTangentAt(Math.min(1,u+.025));
    bank=reducedMotion?0:clamp((next.x-tangent.x)*-1.1,-.15,.15);
    speed=Math.sin(k*Math.PI);fov=58+(reducedMotion?0:speed*10);
    wing=smooth((t-15.65)/1.1)*(1-smooth((t-36.5)/3));
    blink=1-smooth((t-FLIGHT_START)/.65);
  }else{
    position.set(0,89.65,-426);look.set(0,90.3,-440);fov=58;
  }
  camera.position.copy(position);camera.lookAt(look);camera.rotateZ(bank);
  if(Math.abs(camera.fov-fov)>.002){camera.fov=fov;camera.updateProjectionMatrix();}
  wings.update({time:t,amount:wing,flap:t<22?1:.28});
  const outside=smooth((t-16)/3);
  skyLight.intensity=outside*.85;
  scene.background.set('#070d18').lerp(new THREE.Color('#101e32'),outside);
  scene.fog.color.copy(scene.background);scene.fog.density=mix(.016,.0027,outside);
  if(t>39)scene.fog.density=mix(.0027,.007,smooth((t-39)/4));
  gallery.update({time:t,reveal:smooth((t-31)/4),elapsed:t>=41?t-41:-1});
  $('darkness').style.opacity=String(1-smooth(light*1.9));$('blink').style.opacity=String(blink);
  $('altitude').textContent=String(Math.max(0,Math.round(position.y-1.65))).padStart(3,'0');
  const phaseIndex=Math.max(0,phaseTimes.findLastIndex(start=>t>=start));
  if(phaseIndex!==lastChapter){
    if(playing && (phaseIndex===2||phaseIndex===5))sound.chime();lastChapter=phaseIndex;
  }
  const lightStage=Math.floor(light*4);
  if(lightStage!==lastLight&&t<5&&playing){sound.light();lastLight=lightStage;}
  $('gallery-title').hidden=!(t>=41&&t<46);
  $('gallery-title').style.opacity=String(smooth((t-41)/1.3)*(1-smooth((t-44.5)/1.5)));
  sound.update(speed,light,t,wing);updateControls();
}

function displayPhoto(index){
  currentPhoto=(index+PHOTO_SOURCES.length)%PHOTO_SOURCES.length;
  $('large-photo').src=PHOTO_SOURCES[currentPhoto];$('large-photo').alt=PHOTO_TITLES[currentPhoto];
  $('photo-title').textContent=`${String(currentPhoto+1).padStart(2,'0')} / 10`;
}
function enterGallery(){
  playing=false;galleryTime=41;galleryControls.enter();
  $('experience').classList.add('is-gallery');
  $('hud').hidden=true;$('playback').hidden=true;$('gallery-title').hidden=true;$('gallery-controls').hidden=false;
  $('scene').focus();sound.start();
}
async function initialize(){try{
  renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  scene=new THREE.Scene();scene.background=new THREE.Color('#070d18');scene.fog=new THREE.FogExp2('#070d18',.016);
  skyLight=new THREE.HemisphereLight(0xa9c8ed,0x101824,0);scene.add(skyLight);
  camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.025,1400);scene.add(camera);
  const environmentScene=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environmentMap=pmrem.fromScene(environmentScene,.04).texture;
  environmentScene.dispose();pmrem.dispose();
  world=createWorld(THREE,scene);city=createCity(THREE,scene);crow=await createCrow(THREE,{environmentMap});crow.root.position.set(0,.67,-6.5);scene.add(crow.root);
  wings=createFlightWings(THREE,camera,{environmentMap});
  const loader=new THREE.TextureLoader();const textures=await Promise.all([FLOOR_SOURCE,...PHOTO_SOURCES].map(url=>loader.loadAsync(url)));
  for(const texture of textures){texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  gallery=createGallery(THREE,scene,{floorTexture:textures[0],photoTextures:textures.slice(1)});gallery.root.position.copy(galleryOffset);
  galleryControls=createGalleryControls(THREE,{
    camera,canvas:$('scene'),gallery,stick:$('move-stick'),
    isBlocked:()=>clean||document.hidden||$('lightbox').open||!$('error').hidden,
    onPhotoOpen:index=>{displayPhoto(index);$('lightbox').showModal();},
  });
  renderAt(0);ready=true;$('start').disabled=false;$('start').textContent='▶　フライトを再生';
  renderer.setAnimationLoop(now=>{
    const dt=lastFrame?clamp((now-lastFrame)/1000,0,.1):0;lastFrame=now;
    if(playing){time=Math.min(DURATION,time+dt);renderAt(time);if(time>=DURATION)enterGallery();}
    if(galleryControls.active&&!document.hidden){
      galleryTime+=dt;gallery.update({time:galleryTime,reveal:1,elapsed:galleryTime-41});
      galleryControls.update(dt);city.update({time:galleryTime,reveal:1});sound.update(0,1,galleryTime,0);
    }
    renderer.render(scene,camera);
  });
}catch(error){console.error(error);fail('3D空間の読み込みに失敗しました。WebGL 2 対応のブラウザで再読み込みしてください。');}}

$('start').addEventListener('click',start);$('gallery-restart').addEventListener('click',start);$('restart').addEventListener('click',start);$('pause').addEventListener('click',togglePlay);
$('clean').addEventListener('click',()=>setClean(!clean));$('show-ui').addEventListener('click',()=>setClean(false));
$('scene').addEventListener('click',()=>{if(clean)setClean(false);});
$('sound').addEventListener('click',()=>{const on=sound.toggle();$('sound').textContent=on?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'音をオフにする':'音をオンにする');if(on&&(playing||galleryControls?.active))sound.start();});
$('seek').addEventListener('input',event=>{time=Number(event.target.value);renderAt(time);if(time>=DURATION)enterGallery();});
$('close-lightbox').addEventListener('click',()=>$('lightbox').close());
$('previous-photo').addEventListener('click',()=>displayPhoto(currentPhoto-1));$('next-photo').addEventListener('click',()=>displayPhoto(currentPhoto+1));
$('reload').addEventListener('click',()=>location.reload());
window.addEventListener('keydown',event=>{
  if(event.metaKey||event.ctrlKey||event.altKey||event.repeat)return;
  if($('lightbox').open){if(event.key==='ArrowLeft')displayPhoto(currentPhoto-1);if(event.key==='ArrowRight')displayPhoto(currentPhoto+1);return;}
  if(event.code==='KeyH'&&started){event.preventDefault();setClean(!clean);}
  if(event.code==='Escape'&&started){setClean(false);if(!galleryControls.active)setPlaying(false);else galleryControls.resetInputs();}
  if(event.code==='Space'&&started&&!(event.target instanceof HTMLButtonElement)&&!(event.target instanceof HTMLInputElement)){event.preventDefault();togglePlay();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)setPlaying(false);});
window.addEventListener('resize',()=>{if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);galleryControls?.refit();});
$('scene').addEventListener('webglcontextlost',event=>{event.preventDefault();fail('描画が中断されました。再読み込みして、もう一度フライトを再生してください。');});
initialize();

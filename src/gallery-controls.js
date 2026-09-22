// Pointer look, touch movement and collision-safe photo visits, only after arrival.
export function createGalleryControls(THREE,{camera,canvas,gallery,stick,onPhotoOpen,isBlocked}) {
  let active=false,drag=null,stickPointer=null,travel=null,focused=null,yaw=0,pitch=0;
  const keys=new Set(),input=new THREE.Vector2(),raycaster=new THREE.Raycaster();
  const euler=new THREE.Euler(0,0,0,'YXZ'),matrix=new THREE.Matrix4(),aim=new THREE.Quaternion();
  const knob=stick.querySelector('.stick-knob');
  const clamp=THREE.MathUtils.clamp,smooth=t=>t*t*(3-2*t);
  const baseLabel='展示室。ドラッグで見回す。移動スティックか矢印キーで移動。写真をタップすると正面へ移動し、もう一度タップで拡大。';
  const available=()=>active&&!isBlocked();
  function syncAngles(){euler.setFromQuaternion(camera.quaternion,'YXZ');yaw=euler.y;pitch=euler.x;}
  function resetStick(){
    if(stickPointer!==null&&stick.hasPointerCapture(stickPointer))stick.releasePointerCapture(stickPointer);
    stickPointer=null;input.set(0,0);knob.style.transform='translate(0px,0px)';stick.classList.remove('is-moving');
  }
  function resetInputs(){
    if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);
    drag=null;keys.clear();resetStick();
  }
  function cancelVisit(){travel=null;focused=null;canvas.setAttribute('aria-label',baseLabel);}
  function safeMove(dx,dz){
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
    for(let i=0;i<steps;i++){
      const nextX=camera.position.x+dx/steps,nextZ=camera.position.z+dz/steps;
      if(gallery.canStand(nextX-gallery.root.position.x,camera.position.z-gallery.root.position.z))camera.position.x=nextX;
      if(gallery.canStand(camera.position.x-gallery.root.position.x,nextZ-gallery.root.position.z))camera.position.z=nextZ;
    }
  }
  function visitPhoto(index,openFocused=true){
    if(openFocused&&focused===index&&!travel){resetInputs();onPhotoOpen(index);return;}
    const view=gallery.getPhotoView(index,camera);if(!view)return;
    const points=gallery.findPath(camera.position,view.position);if(!points)return;
    resetInputs();
    const lengths=[];let distance=0;
    for(let i=1;i<points.length;i++){distance+=points[i-1].distanceTo(points[i]);lengths.push(distance);}
    travel={index,points,lengths,distance,target:view.target,elapsed:0,duration:Math.max(1.25,distance/4),rotation:camera.quaternion.clone()};
    focused=null;canvas.setAttribute('aria-label',`写真${index+1}の正面へ移動中。ドラッグで中断できます。`);
  }
  function pick(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);
    const index=gallery.pickPhoto(raycaster);if(index!==null)visitPhoto(index);
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!available()||drag||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
    canvas.setPointerCapture(event.pointerId);canvas.focus();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!available()||!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    const moved=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6;
    if(drag.moved||moved){
      if(!drag.moved){syncAngles();cancelVisit();}
      drag.moved=true;const sensitivity=event.pointerType==='touch'?.004:.003;
      yaw-=dx*sensitivity;pitch=clamp(pitch-dy*sensitivity,-1.2,1.15);
      camera.rotation.set(pitch,yaw,0,'YXZ');
    }
    drag.x=event.clientX;drag.y=event.clientY;
  });
  canvas.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const tap=!drag.moved&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<=6;
    drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(tap&&available())pick(event.clientX,event.clientY);
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;});
  function moveStick(event){
    const rect=stick.getBoundingClientRect(),radius=rect.width*.32;
    let x=(event.clientX-rect.left-rect.width/2)/radius,y=(event.clientY-rect.top-rect.height/2)/radius;
    const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
    input.set(x,y);if(length<.13)input.set(0,0);
    knob.style.transform=`translate(${x*radius}px,${y*radius}px)`;
  }
  stick.addEventListener('pointerdown',event=>{
    if(!available()||stickPointer!==null)return;event.preventDefault();
    stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);stick.classList.add('is-moving');syncAngles();cancelVisit();moveStick(event);
  });
  stick.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer&&available())moveStick(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,event=>{if(event.pointerId===stickPointer)resetStick();});
  window.addEventListener('keydown',event=>{
    if(!available()||event.metaKey||event.ctrlKey||event.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))return;
    event.preventDefault();if(!keys.size){syncAngles();cancelVisit();}keys.add(event.code);
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',resetInputs);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs();});
  function update(dt){
    if(!available())return;
    let sideways=input.x+(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0);
    let forward=-input.y+(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
    const length=Math.hypot(sideways,forward);
    if(length>.01){
      if(length>1){sideways/=length;forward/=length;}
      const step=3*dt;safeMove((sideways*Math.cos(yaw)-forward*Math.sin(yaw))*step,(-forward*Math.cos(yaw)-sideways*Math.sin(yaw))*step);
    }
    if(!travel)return;
    travel.elapsed=Math.min(travel.duration,travel.elapsed+dt);
    const progress=travel.elapsed/travel.duration,distance=smooth(progress)*travel.distance;
    let previous=0;
    for(let i=0;i<travel.lengths.length;i++){
      if(distance<=travel.lengths[i]||i===travel.lengths.length-1){
        const amount=clamp((distance-previous)/Math.max(.0001,travel.lengths[i]-previous),0,1);
        camera.position.copy(travel.points[i]).lerp(travel.points[i+1],amount);break;
      }
      previous=travel.lengths[i];
    }
    matrix.lookAt(camera.position,travel.target,camera.up);aim.setFromRotationMatrix(matrix);
    camera.quaternion.copy(travel.rotation).slerp(aim,smooth(Math.min(1,progress*2.5)));
    if(progress>=1){focused=travel.index;travel=null;syncAngles();canvas.setAttribute('aria-label',`写真${focused+1}を鑑賞中。もう一度写真をタップで拡大。ドラッグで見回す。`);}
  }
  return {
    get active(){return active;},
    enter(){active=true;travel=null;focused=null;resetInputs();syncAngles();canvas.classList.add('can-explore');canvas.setAttribute('aria-label',baseLabel);},
    exit(){active=false;travel=null;focused=null;resetInputs();canvas.classList.remove('can-explore');canvas.setAttribute('aria-label','カラスと出会うロビー、都市の飛行、夜景に浮かぶ写真展');},
    update,resetInputs,
    refit(){if(available()&&focused!==null)visitPhoto(focused,false);},
  };
}

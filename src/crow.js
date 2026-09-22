// Supplied mechanical crow; the GLB is static, so flight wings are articulated separately.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import crowBytes from '../assets/models/crow.glb';

function disposeTree(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material]){
      materials.add(material);
      for(const key of ['map','metalnessMap','roughnessMap','normalMap'])if(material[key])textures.add(material[key]);
    }
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();
}

export async function createCrow(THREE,{environmentMap=null}={}) {
  const gltf=await new GLTFLoader().parseAsync(crowBytes.buffer.slice(crowBytes.byteOffset,crowBytes.byteOffset+crowBytes.byteLength),'');
  const root=new THREE.Group();root.name='supplied-mechanical-crow';
  const pivot=new THREE.Group();root.add(pivot);
  const model=gltf.scene;model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const scale=1.06/size.y;
  model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);pivot.add(model);
  model.traverse(node=>{
    if(!node.isMesh)return;
    for(const material of Array.isArray(node.material)?node.material:[node.material]){
      material.envMap=environmentMap;material.envMapIntensity=.8;
      if(material.map)material.map.anisotropy=4;
    }
  });
  // The amber eye was located in the supplied model's head texture/UVs.
  const eye=new THREE.Vector3(.00678535,.112205,.04728456)
    .sub(new THREE.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(scale);
  const headTarget=eye.clone();
  return {root,headTarget,
    update({time=0}={}){
      pivot.rotation.y=-.28+Math.sin(time*.65)*.018;
      headTarget.copy(eye).applyEuler(pivot.rotation);
    },
    dispose(){disposeTree(root);},
  };
}

export function createFlightWings(THREE,camera,{environmentMap=null}={}) {
  const root=new THREE.Group();root.name='mechanical-first-person-wings';root.visible=false;camera.add(root);
  const metal=(color,roughness=.36)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.82,envMap:environmentMap,envMapIntensity:.65});
  const armor=metal(0x323b43),edge=metal(0x9da7ad,.27),dark=metal(0x131a21,.5),brass=metal(0x8f7048,.3);
  const glow=new THREE.MeshStandardMaterial({color:0xcba766,emissive:0x9c5b1e,emissiveIntensity:.5,metalness:.55,roughness:.3,envMap:environmentMap});
  const boxGeometry=new THREE.BoxGeometry(1,1,1),boltGeometry=new THREE.CylinderGeometry(.018,.018,.016,6);
  const axisY=new THREE.Vector3(0,1,0),wings=[];
  function box(parent,size,position,material){const mesh=new THREE.Mesh(boxGeometry,material);mesh.scale.set(...size);mesh.position.set(...position);parent.add(mesh);return mesh;}
  function rod(parent,a,b,radius,material){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),material);
    mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(axisY,delta.normalize());parent.add(mesh);return mesh;
  }
  function blade(parent,length,width,x,z,rotation,index){
    const shape=new THREE.Shape();shape.moveTo(-width*.4,0);shape.lineTo(width*.4,0);
    shape.lineTo(width*.48,length*.64);shape.lineTo(width*.16,length);shape.lineTo(-width*.27,length*.88);shape.lineTo(-width*.48,length*.15);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.003});
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation;parent.add(group);
    const mesh=new THREE.Mesh(geometry,index%3===0?edge:armor);mesh.rotation.x=Math.PI/2;group.add(mesh);
    box(group,[.014,.018,length*.8],[0,.009,length*.42],dark);
    box(group,[width*.66,.014,.027],[0,.013,length*.23],brass);
    const bolt=new THREE.Mesh(boltGeometry,edge);bolt.position.set(0,.023,.038);group.add(bolt);
    if(index%3===0)box(group,[.013,.008,.075],[width*.2,.014,length*.68],glow);
  }
  function joint(parent,x,z,radius){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.052,16),dark);mesh.position.set(x,.012,z);parent.add(mesh);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*.77,.008,6,20),brass);ring.rotation.x=-Math.PI/2;ring.position.set(x,.043,z);parent.add(ring);
    const bolt=new THREE.Mesh(boltGeometry,edge);bolt.position.set(x,.046,z);parent.add(bolt);
  }
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.37,-.43,-1.1);root.add(shoulder);
    const outer=new THREE.Group();outer.position.set(side*.67,.005,-.3);shoulder.add(outer);
    for(let i=0;i<9;i++)blade(shoulder,.43+i*.021,.13,side*(.035+i*.073),-.025-i*.032,side*(.1+i*.012),i);
    for(let i=0;i<7;i++)blade(outer,.65-i*.034,.113,side*i*.057,-i*.035,-side*(.33+i*.13),i+1);
    rod(shoulder,[0,.04,-.035],[side*.67,.04,-.3],.038,dark);
    rod(shoulder,[side*.07,.082,.04],[side*.58,.075,-.15],.015,edge);
    rod(shoulder,[side*.07,.082,.04],[side*.3,.079,-.046],.027,brass);
    rod(outer,[0,.04,0],[side*.31,.04,-.21],.025,dark);
    joint(shoulder,0,-.035,.069);joint(shoulder,side*.67,-.3,.06);joint(outer,side*.25,-.18,.036);
    wings.push({shoulder,outer,side});
  }
  return {root,
    update({time=0,amount=0,flap=1}={}){
      const visibility=THREE.MathUtils.clamp(amount,0,1);root.visible=visibility>.001;
      root.scale.x=Math.min(1,camera.aspect/1.05);root.position.y=-.65*(1-visibility);
      const stroke=Math.sin(time*8.3),lag=Math.sin(time*8.3-.65);
      for(const {shoulder,outer,side} of wings){
        shoulder.rotation.z=side*(.1+stroke*.27*flap);shoulder.rotation.x=-.055+stroke*.09*flap;
        outer.rotation.z=side*(-.045+lag*.19*flap);outer.rotation.y=side*(.08+lag*.075*flap);
      }
    },
    dispose(){disposeTree(root);},
  };
}

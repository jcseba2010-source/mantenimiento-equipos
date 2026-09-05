let empresas=[], sedes=[], equipos=[], perfil=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
function showView(id){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
 document.querySelectorAll('nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
}

async function init(){
 const {data:{session}}=await sb.auth.getSession();
 if(session) await enterApp(session.user); else showLogin();
 sb.auth.onAuthStateChange(async (_event,session)=>{if(session)await enterApp(session.user);else showLogin()});
}
function showLogin(){$('loginView').classList.remove('hidden');$('appView').classList.add('hidden')}
async function enterApp(user){
 $('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
 const {data,error}=await sb.from('perfiles').select('*').eq('id',user.id).maybeSingle();
 perfil=data;
 $('userInfo').textContent=data?`${data.nombres} — ${data.rol}`:user.email;
 await cargarTodo();
}

$('loginForm').onsubmit=async e=>{
 e.preventDefault();$('loginMsg').textContent='Ingresando...';
 const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
 $('loginMsg').textContent=error?error.message:'';
};
async function logout(){await sb.auth.signOut()} window.logout=logout;

async function cargarTodo(){
 const [a,b,c,d]=await Promise.all([
  sb.from('empresas').select('*').order('razon_social'),
  sb.from('sedes').select('*').order('nombre'),
  sb.from('equipos').select('*').order('codigo_interno'),
  sb.from('ordenes_trabajo').select('id',{count:'exact',head:true}).neq('estado','Cerrada')
 ]);
 if(a.error) alert('Empresas: '+a.error.message);
 if(b.error) alert('Sedes: '+b.error.message);
 if(c.error) alert('Equipos: '+c.error.message);
 empresas=a.data||[];sedes=b.data||[];equipos=c.data||[];
 $('statEmpresas').textContent=empresas.length;$('statSedes').textContent=sedes.length;$('statEquipos').textContent=equipos.length;$('statOrdenes').textContent=d.count||0;
 renderEmpresas();renderSedes();renderEquipos();fillSelects();
}
function fillSelects(){
 const opts=empresas.map(e=>`<option value="${e.id}">${esc(e.razon_social)}</option>`).join('');
 $('sede_empresa_id').innerHTML=opts;
 $('equipo_empresa_id').innerHTML=opts;
 $('filtroEmpresa').innerHTML='<option value="">Todas las empresas</option>'+opts;
 updateSedeSelect();
}
function updateSedeSelect(){
 const eid=$('equipo_empresa_id').value;
 $('equipo_sede_id').innerHTML='<option value="">Sin sede</option>'+sedes.filter(s=>s.empresa_id===eid).map(s=>`<option value="${s.id}">${esc(s.nombre)}</option>`).join('');
}
$('equipo_empresa_id').onchange=updateSedeSelect;

function renderEmpresas(){
 $('tablaEmpresas').innerHTML=empresas.map(e=>`<tr><td><b>${esc(e.razon_social)}</b></td><td>${esc(e.nit||'-')}</td><td>${esc(e.ciudad||'-')}</td><td>${esc(e.contacto_principal||'-')}</td><td>${esc(e.telefono||'-')}</td><td><span class="badge">${esc(e.estado)}</span></td><td><button class="btn" onclick="openEmpresa('${e.id}')">Editar</button></td></tr>`).join('');
}

function renderSedes(){
  $('tablaSedes').innerHTML = sedes.map(s => {
    let e = empresas.find(x => x.id === s.empresa_id);

    return `
      <tr>
        <td>${esc(e?.razon_social || '-')}</td>
        <td><b>${esc(s.nombre)}</b></td>
        <td>${esc(s.ciudad || '-')}</td>
        <td>${esc(s.direccion || '-')}</td>
        <td>${esc(s.responsable || '-')}</td>
        <td>
          <button class="btn" onclick="openSede('${s.id}')">
            Editar
          </button>

          <button class="btn" onclick="eliminarSede('${s.id}')">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
async function eliminarSede(id){

  const sede = sedes.find(s => s.id === id);

  if(!sede){
    alert('No se encontró la sede.');
    return;
  }

  const confirmar = confirm(
    `¿Seguro que deseas eliminar la sede "${sede.nombre}"?`
  );

  if(!confirmar) return;

  const { error } = await sb
    .from('sedes')
    .delete()
    .eq('id', id);

  if(error){
    alert('No se pudo eliminar la sede: ' + error.message);
    return;
  }

  alert('Sede eliminada correctamente.');

  await cargarDatos();
}
function renderEquipos(){
 let q=$('buscarEquipo').value.toLowerCase().trim(),fe=$('filtroEmpresa').value;
 let r=equipos.filter(e=>(!fe||e.empresa_id===fe)&&[e.codigo_interno,e.nombre,e.marca,e.ubicacion].join(' ').toLowerCase().includes(q));
 $('tablaEquipos').innerHTML=r.map(e=>{let em=empresas.find(x=>x.id===e.empresa_id),sd=sedes.find(x=>x.id===e.sede_id);return `<tr><td><b>${esc(e.codigo_interno)}</b></td><td>${esc(e.nombre)}</td><td>${esc(em?.razon_social||'-')}</td><td>${esc(sd?.nombre||'-')}</td><td>${esc(e.ubicacion||'-')}</td><td><span class="badge">${esc(e.estado)}</span></td><td>${e.proximo_mantenimiento||'-'}</td><td><button class="btn" onclick="openEquipo('${e.id}')">Editar</button></td></tr>`}).join('');
}
$('buscarEquipo').oninput=renderEquipos;$('filtroEmpresa').onchange=renderEquipos;

function closeModal(id){$(id).classList.add('hidden')} window.closeModal=closeModal;

function openEmpresa(id=''){
 $('empresaForm').reset();$('empresaId').value='';$('empresaTitle').textContent=id?'Editar empresa':'Nueva empresa';
 if(id){let e=empresas.find(x=>x.id===id);$('empresaId').value=id;['razon_social','nit','contacto_principal'].forEach(k=>$(k).value=e[k]||'');$('empresa_telefono').value=e.telefono||'';$('empresa_correo').value=e.correo||'';$('empresa_ciudad').value=e.ciudad||'';$('empresa_direccion').value=e.direccion||'';$('empresa_estado').value=e.estado||'Activa';$('empresa_observaciones').value=e.observaciones||''}
 $('empresaModal').classList.remove('hidden');
} window.openEmpresa=openEmpresa;

$('empresaForm').onsubmit=async e=>{
 e.preventDefault();
 let data={razon_social:$('razon_social').value.trim(),nit:$('nit').value.trim()||null,contacto_principal:$('contacto_principal').value.trim()||null,telefono:$('empresa_telefono').value.trim()||null,correo:$('empresa_correo').value.trim()||null,ciudad:$('empresa_ciudad').value.trim()||null,direccion:$('empresa_direccion').value.trim()||null,estado:$('empresa_estado').value,observaciones:$('empresa_observaciones').value.trim()||null};
 let id=$('empresaId').value;let r=id?await sb.from('empresas').update(data).eq('id',id):await sb.from('empresas').insert(data);
 if(r.error)return alert(r.error.message);closeModal('empresaModal');await cargarTodo();
};

function openSede(id=''){
 $('sedeForm').reset();$('sedeId').value='';$('sedeTitle').textContent=id?'Editar sede':'Nueva sede';fillSelects();
 if(id){let s=sedes.find(x=>x.id===id);$('sedeId').value=id;$('sede_empresa_id').value=s.empresa_id;$('sede_nombre').value=s.nombre;$('sede_ciudad').value=s.ciudad||'';$('sede_direccion').value=s.direccion||'';$('sede_telefono').value=s.telefono||'';$('sede_responsable').value=s.responsable||'';$('sede_correo').value=s.correo||'';$('sede_estado').value=s.estado||'Activa'}
 $('sedeModal').classList.remove('hidden');
} window.openSede=openSede;

$('sedeForm').onsubmit=async e=>{
 e.preventDefault();let data={empresa_id:$('sede_empresa_id').value,nombre:$('sede_nombre').value.trim(),ciudad:$('sede_ciudad').value.trim()||null,direccion:$('sede_direccion').value.trim()||null,telefono:$('sede_telefono').value.trim()||null,responsable:$('sede_responsable').value.trim()||null,correo:$('sede_correo').value.trim()||null,estado:$('sede_estado').value};let id=$('sedeId').value;
const nombreNormalizado = (data.nombre || '').trim().toLowerCase();

const sedeDuplicada = sedes.some(s =>
  s.empresa_id === data.empresa_id &&
  (s.nombre || '').trim().toLowerCase() === nombreNormalizado
);

if (sedeDuplicada) {
  alert('Esta sede ya existe para la empresa seleccionada.');
  return;
}

let r = await sb.from('sedes').insert(data);

if (r.error) {
  return alert(r.error.message);
}

closeModal('sedeModal');

await cargarTodo(); 
};

function openEquipo(id=''){
 $('equipoForm').reset();$('equipoId').value='';$('equipoTitle').textContent=id?'Editar equipo':'Nuevo equipo';fillSelects();
 if(id){let e=equipos.find(x=>x.id===id);$('equipoId').value=id;$('equipo_empresa_id').value=e.empresa_id;updateSedeSelect();$('equipo_sede_id').value=e.sede_id||'';$('codigo_interno').value=e.codigo_interno;$('equipo_nombre').value=e.nombre;$('equipo_tipo').value=e.tipo;$('equipo_marca').value=e.marca||'';$('equipo_modelo').value=e.modelo||'';$('numero_serie').value=e.numero_serie||'';$('equipo_ubicacion').value=e.ubicacion||'';$('equipo_responsable').value=e.responsable||'';$('equipo_estado').value=e.estado;$('fecha_compra').value=e.fecha_compra||'';$('ultimo_mantenimiento').value=e.ultimo_mantenimiento||'';$('proximo_mantenimiento').value=e.proximo_mantenimiento||'';$('periodicidad_dias').value=e.periodicidad_dias||'';$('equipo_observaciones').value=e.observaciones||''}
 $('equipoModal').classList.remove('hidden');
} window.openEquipo=openEquipo;

$('equipoForm').onsubmit=async e=>{
 e.preventDefault();let data={empresa_id:$('equipo_empresa_id').value,sede_id:$('equipo_sede_id').value||null,codigo_interno:$('codigo_interno').value.trim(),nombre:$('equipo_nombre').value.trim(),tipo:$('equipo_tipo').value.trim(),marca:$('equipo_marca').value.trim()||null,modelo:$('equipo_modelo').value.trim()||null,numero_serie:$('numero_serie').value.trim()||null,ubicacion:$('equipo_ubicacion').value.trim()||null,responsable:$('equipo_responsable').value.trim()||null,estado:$('equipo_estado').value,fecha_compra:$('fecha_compra').value||null,ultimo_mantenimiento:$('ultimo_mantenimiento').value||null,proximo_mantenimiento:$('proximo_mantenimiento').value||null,periodicidad_dias:$('periodicidad_dias').value?Number($('periodicidad_dias').value):null,observaciones:$('equipo_observaciones').value.trim()||null};let id=$('equipoId').value;let r=id?await sb.from('equipos').update(data).eq('id',id):await sb.from('equipos').insert(data);if(r.error)return alert(r.error.message);closeModal('equipoModal');await cargarTodo();
};
init();

const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
const STYLES={dark:'https://tiles.openfreemap.org/styles/dark',light:'https://tiles.openfreemap.org/styles/positron'};
const RULES=['old_street','kcl','kingston','rent'],RN={old_street:'Old St',kcl:'KCL',kingston:'Drive',rent:'Rent'};
let LG,A,R,D,L,S={},map,cur=null,lfilter='active',theme=localStorage.theme||'dark',kmode='best';
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
document.documentElement.dataset.theme=theme;
const j=u=>fetch(u,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
Promise.all(['data/areas.geojson','data/rules.json','data/districts.geojson','data/listings.json'].map(j)).then(([a,r,d,l])=>{A=a;R=r;D=d||{type:'FeatureCollection',features:[]};L=(l&&l.listings)||[];LG=l&&l.generated;init()});
const gbp=v=>v==null?'—':'£'+Math.round(v).toLocaleString('en-GB');
function init(){
 const T=R.thresholds;[['os','old_street_max_min'],['kcl','kcl_max_min'],['kt','kingston_max_min'],['tf','traffic_factor'],['rent','rent_max_gbp']].forEach(([id,k])=>{const e=$(id);Object.assign(e,{min:T[k].min,max:T[k].max,step:T[k].step});e.dataset.def=T[k].default;e.value=T[k].default;e.oninput=update});
 const rt=T.rent_max_gbp;$('rentmarks').innerHTML=(rt.marks||[]).map(m=>`<span class="mk" style="left:calc(11px + (100% - 22px)*${(m.value-rt.min)/(rt.max-rt.min)})">${gbp(m.value)} · ${m.label}</span>`).join('');
 $$('#filters input[type=checkbox]').forEach(e=>e.onchange=update);
 $$('#kmode button').forEach(b=>b.onclick=()=>{kmode=b.dataset.v;$$('#kmode button').forEach(x=>x.classList.toggle('on',x==b));update()});
 $('reset').onclick=()=>{$$('input[type=range]').forEach(e=>e.value=e.dataset.def);$$('#filters input[type=checkbox]').forEach(e=>e.checked=true);$$('#kmode button')[0].click()};
 $$('#tabs button').forEach((b,i)=>b.onclick=()=>tab(b.dataset.t));
 $('theme').onclick=()=>{theme=theme=='dark'?'light':'dark';localStorage.theme=theme;document.documentElement.dataset.theme=theme;themeIcon();A.features.length&&update();map.setStyle(STYLES[theme],{diff:false});document.querySelector('meta[name=theme-color]').content=theme=='dark'?'#0b0c0f':'#f6f6f8'};
 themeIcon();sheetGestures();about();listingsUI();
 map=new maplibregl.Map({container:'map',style:STYLES[theme],center:[-0.105,51.492],zoom:innerWidth<860?10.6:11.4,attributionControl:{compact:true},pitchWithRotate:false});
 if(innerWidth>=860)map.setPadding({left:420});else map.setPadding({bottom:innerHeight*.45,top:60});
 map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
 map.on('style.load',layers);
 R.anchors.forEach(p=>{const el=document.createElement('div');el.className='pin'+(p.name.startsWith('Kingston')?' kt':'');new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).setPopup(new maplibregl.Popup({offset:12,closeButton:false}).setText(p.name)).addTo(map)});
 map.on('click',e=>{const f=map.queryRenderedFeatures(e.point,{layers:['areas-dot','districts-fill'].filter(l=>map.getLayer(l))});if(!f.length){closeCard();return}
  const p=f[0].properties;show(p.name||JSON.parse(p.areas)[0])});
 ['areas-dot','districts-fill'].forEach(l=>{map.on('mouseenter',l,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',l,()=>map.getCanvas().style.cursor='')});
 update();
}
function themeIcon(){$('theme').innerHTML=theme=='dark'?'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></svg>'}
function layers(){if(map.getSource('areas'))return;
 const dk=theme=='dark';
 map.addSource('districts',{type:'geojson',data:D});map.addSource('areas',{type:'geojson',data:A});
 map.addLayer({id:'districts-fill',type:'fill',source:'districts',paint:{'fill-color':['coalesce',['get','col'],'#888'],'fill-opacity':dk?.16:.2}});
 map.addLayer({id:'districts-line',type:'line',source:'districts',paint:{'line-color':['coalesce',['get','col'],'#888'],'line-width':1.2,'line-opacity':.7}});
 map.addLayer({id:'districts-sel',type:'line',source:'districts',filter:['==',['get','district'],''],paint:{'line-color':dk?'#fff':'#16171c','line-width':1.6,'line-opacity':.85}});
 map.addLayer({id:'districts-label',type:'symbol',source:'districts',layout:{'text-field':['get','district'],'text-size':11,'text-font':['Noto Sans Bold'],'text-letter-spacing':.08},paint:{'text-color':dk?'rgba(255,255,255,.45)':'rgba(0,0,0,.45)'}});
 map.addLayer({id:'areas-halo',type:'circle',source:'areas',paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,6,14,16],'circle-color':['get','col'],'circle-opacity':.18,'circle-blur':.6}});
 map.addLayer({id:'areas-dot',type:'circle',source:'areas',paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,3.5,14,7],'circle-color':['get','col'],'circle-stroke-color':dk?'#0b0c0f':'#fff','circle-stroke-width':1.5}});
 map.addLayer({id:'areas-label',type:'symbol',source:'areas',minzoom:12,layout:{'text-field':['get','short'],'text-size':12,'text-font':['Noto Sans Regular'],'text-offset':[0,1.1],'text-anchor':'top'},paint:{'text-color':dk?'#ececf1':'#16171c','text-halo-color':dk?'#0b0c0f':'#fff','text-halo-width':1.4}});
 map.addSource('listings',{type:'geojson',data:lgeo()});
 map.addLayer({id:'listings-dot',type:'circle',source:'listings',paint:{'circle-radius':['case',['==',['get','fresh'],1],6.5,5],'circle-color':['case',['==',['get','let'],1],'#666','#fff'],'circle-stroke-color':['case',['==',['get','let'],1],'#444',['==',['get','fresh'],1],css('--g4'),css('--acc')],'circle-stroke-width':3,'circle-opacity':['case',['==',['get','let'],1],.5,1]}});
 map.on('click','listings-dot',e=>{tab('listings');const el=document.querySelector(`[data-id="${CSS.escape(e.features[0].properties.id)}"]`);el&&el.scrollIntoView({behavior:'smooth',block:'center'})});
 paint();
}
function evalA(p){const kv=kmode=='best'?p.kcl_best_min:p.kcl_avg_min,drive=p.osrm_free_min==null?null:+(p.osrm_free_min*S.tf).toFixed(1);
 const t={old_street:[p.old_street_min,S.os],kcl:[kv,S.kcl],kingston:[drive,S.kt],rent:[p.rent_1bed_median,S.rent]},pass={};let sc=0,n=0;
 for(const r in t){const[v,th]=t[r];pass[r]=v==null?null:v<=th;if(S.on[r]){n+=(R.weights[r]||1);if(pass[r])sc+=(R.weights[r]||1)}}
 return{kv,drive,pass,sc,n}}
function colour(sc,n){if(!n)return css('--mut');const f=sc/n;return css(f>=1?'--g4':f>=.75?'--g3':f>=.5?'--g2':'--g1')}
function update(){S={os:+$('os').value,kcl:+$('kcl').value,kt:+$('kt').value,tf:+$('tf').value,rent:+$('rent').value,on:{}};
 RULES.forEach(r=>S.on[r]=$('r_'+r).checked);
 $$('input[type=range]').forEach(e=>e.style.setProperty('--p',(e.value-e.min)/(e.max-e.min)*100+'%'));
 $('v_os').textContent=S.os+' min';$('v_kcl').textContent=S.kcl+' min';$('v_kt').textContent=S.kt+' min';$('v_tf').textContent='×'+S.tf.toFixed(2);$('v_rent').textContent=gbp(S.rent);
 A.features.forEach(f=>{const p=f.properties,e=evalA(p);Object.assign(p,{col:colour(e.sc,e.n),_e:e,short:p.name.replace(/ \(.*\)/,'')})});
 const by=Object.fromEntries(A.features.map(f=>[f.properties.name,f.properties]));
 D.features.forEach(f=>{const ps=f.properties.areas.map(n=>by[n]).filter(Boolean),b=ps.sort((a,c)=>c._e.sc-a._e.sc)[0];f.properties.col=b?b.col:null;f.properties.name=b?b.name:null});
 paint();list();if(cur)show(cur,false)}
function paint(){if(!map||!map.getSource('areas'))return;map.getSource('areas').setData(A);map.getSource('districts').setData(D);
 const v=$('l_districts').checked?'visible':'none';['districts-fill','districts-line','districts-label'].forEach(l=>map.setLayoutProperty(l,'visibility',v))}
function sorted(){const k=p=>p.old_street_min+(p._e.drive||99)/2+(p.rent_1bed_median||3000)/150;return A.features.map(f=>f.properties).sort((a,b)=>b._e.sc-a._e.sc||k(a)-k(b))}
function list(){const s=sorted(),full=s.filter(p=>p._e.sc==p._e.n&&p._e.n).length,act=RULES.filter(r=>S.on[r]);
 $('summary').innerHTML=full?`<b>${full}</b> of ${s.length} areas pass every rule`:`No area passes all ${act.length} rules. Closest first.`;
 $('sub').textContent=full?`${full} areas match`:'London flat search';
 $('list').innerHTML=s.map((p,i)=>{const e=p._e,fails=act.filter(r=>e.pass[r]===false);
  return `<li data-n="${p.name}" style="--c:${p.col}"><span class="rk">${i+1}</span><div><div class="nm">${p.short}</div><div class="mt"><span>${p.old_street_min}′ Old St</span><span>${e.kv}′ KCL</span><span>${Math.round(e.drive)}′ drive</span><span>${p.rent_1bed_median?gbp(p.rent_1bed_median):'rent ?'}</span>${fails.length?`<span class="f">✕ ${fails.map(r=>RN[r]).join(', ')}</span>`:''}</div></div><div class="score">${act.map(r=>`<i class="${e.pass[r]?'p':''}"></i>`).join('')}</div></li>`}).join('');
 $$('#list li').forEach(li=>li.onclick=()=>show(li.dataset.n,true))}
let hl=null;
function show(name,fly){const f=A.features.find(f=>f.properties.name==name);if(!f)return;const p=f.properties,e=evalA(p);cur=name;
 const kcl=typeof p.kcl=='string'?JSON.parse(p.kcl):p.kcl,cls=r=>!S.on[r]?'':e.pass[r]==null?'':e.pass[r]?'pass':'fail',bd=r=>e.pass[r]==null?'unknown':e.pass[r]?'PASS':'FAIL';
 $('card').hidden=false;$('card').innerHTML=`<button class="icon x" onclick="closeCard()" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
 <h2>${p.short}</h2><div class="sub">${p.borough} · ${e.sc}/${e.n} rules · ${(p.rent_area_label||'')}</div>
 <div class="grid">
  <div class="m ${cls('old_street')}"><span class="b">${bd('old_street')}</span><div class="k">Old Street</div><div class="v">${p.old_street_min}<small> min</small></div></div>
  <div class="m ${cls('kcl')}"><span class="b">${bd('kcl')}</span><div class="k">KCL ${kmode=='best'?'best':'average'}</div><div class="v">${e.kv}<small> min</small></div></div>
  <div class="m ${cls('kingston')}"><span class="b">${bd('kingston')}</span><div class="k">Kingston ~6pm</div><div class="v">${Math.round(e.drive)}<small> min</small></div><div class="k" style="margin-top:2px">${p.osrm_free_min} min free-flow</div></div>
  <div class="m ${cls('rent')}"><span class="b">${bd('rent')}</span><div class="k">1-bed median</div><div class="v">${p.rent_1bed_median?gbp(p.rent_1bed_median):'unknown'}</div></div>
 </div>
 <div class="campus">${Object.entries(kcl).map(([c,v])=>`<div><span>${c}${c==p.kcl_best_campus?' · best':''}</span><b>${v??'—'} min</b></div>`).join('')}
 <div><span>KCL average</span><b>${p.kcl_avg_min} min</b></div><div><span>Drive distance</span><b>${p.drive_km} km</b></div><div><span>ONS ${p.borough} 1-bed mean</span><b>${gbp(p.ons_borough_1bed_mean)}</b></div></div>`;
 const d=D.features.find(x=>x.properties.areas.includes(name));map.getLayer('districts-sel')&&map.setFilter('districts-sel',['==',['get','district'],d?d.properties.district:'']);
 if(innerWidth<860)$('sheet').className='glass min';
 if(fly){{const mob=innerWidth<860;map.flyTo({center:f.geometry.coordinates,zoom:mob?13:12.6,duration:900,essential:true,padding:mob?{top:70,bottom:$('card').offsetHeight+140,left:0,right:0}:{left:420,right:380,top:0,bottom:0}})}}}
function closeCard(){$('card').hidden=true;cur=null;map.getLayer('districts-sel')&&map.setFilter('districts-sel',['==',['get','district'],''])}
function tab(t){if(innerWidth<860)closeCard();const bs=$$('#tabs button'),i=bs.findIndex(b=>b.dataset.t==t);bs.forEach(b=>b.classList.toggle('on',b.dataset.t==t));$$('.view').forEach(v=>v.classList.toggle('on',v.id==t));
 document.querySelector('#tabs .pill').style.transform=`translateX(${i*100}%)`;if($('sheet').classList.contains('min'))$('sheet').className='glass'}
function sheetGestures(){const s=$('sheet'),g=$('grab');let y0,h0;
 g.onclick=()=>s.className='glass '+(s.classList.contains('min')?'':s.classList.contains('max')?'min':'max');
 g.addEventListener('pointerdown',e=>{y0=e.clientY;h0=s.getBoundingClientRect().height;s.style.transition='none';g.setPointerCapture(e.pointerId)});
 g.addEventListener('pointermove',e=>{if(y0==null)return;s.style.height=Math.max(110,Math.min(innerHeight*.9,h0+y0-e.clientY))+'px'});
 g.addEventListener('pointerup',e=>{if(y0==null)return;const dy=y0-e.clientY;s.style.transition='';s.style.height='';y0=null;if(Math.abs(dy)<6)return;const h=h0+dy,H=innerHeight;s.className='glass '+(h<H*.3?'min':h>H*.7?'max':'')})}
const STAT=['active','new','seen','viewing','applied','rejected'];
let showLet=false,sortBy='best',mvFrom='',mvTo='',lsetupDone=false;
const DAY=864e5,today0=(()=>{const d=new Date();d.setHours(0,0,0,0);return d})();
const iso=d=>{const z=new Date(d);z.setMinutes(z.getMinutes()-z.getTimezoneOffset());return z.toISOString().slice(0,10)};
const TODAY=iso(today0);
const fmtD=s=>{if(!s)return'';const d=new Date(s+'T00:00');return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+(d.getFullYear()!=today0.getFullYear()?' '+String(d.getFullYear()).slice(2):'')};
const mvOf=l=>{const m=l.move_in||l.available_from;return m?(m<TODAY?TODAY:m):null};
function ageOf(l){if(l.listed_date){const d=Math.round((today0-new Date(l.listed_date+'T00:00'))/DAY);return{d,txt:d<=0?'Listed today':d==1?'Listed yesterday':d<60?`Listed ${d}d ago`:d<730?`Listed ${Math.round(d/30)}mo ago`:'Long-running ad'}}
 const t=l.listed_label||'';let m;if(/today/i.test(t))return{d:0,txt:'Listed today'};if(/yesterday/i.test(t))return{d:1,txt:'Listed yesterday'};
 if(m=t.match(/<\s*(\d+)\s*days/))return{d:+m[1]-1,txt:`${/Reduced/i.test(t)?'Reduced':'Listed'} < ${m[1]}d ago`,approx:1};if(m=t.match(/>\s*(\d+)\s*days/))return{d:+m[1]+1,txt:`Listed > ${m[1]}d ago`,approx:1};
 return{d:null,txt:l.first_seen?`First seen ${fmtD(l.first_seen)}`:'Listing date unknown'}}
const freshCls=a=>a.d==null?'':a.d<=3?'f-hot':a.d<=7?'f-warm':a.d<=14?'f-ok':'f-old';
const isLet=l=>l.status=='let';
function base(){return L.filter(l=>showLet||!isLet(l))}
function inMv(l){if(!mvFrom&&!mvTo)return true;const m=mvOf(l);if(m==null)return mvFrom=='unknown';if(mvFrom=='unknown')return false;return(!mvFrom||m>=mvFrom)&&(!mvTo||m<=mvTo)}
function visible(){return base().filter(l=>(lfilter=='active'?!['rejected','let'].includes(l.status)||(showLet&&isLet(l)):l.status==lfilter)&&inMv(l))}
function lsorted(ls){const k={best:(a,b)=>(b.score-a.score)||(a.rent_pcm-b.rent_pcm),movein:(a,b)=>(mvOf(a)||'9999').localeCompare(mvOf(b)||'9999')||(b.score-a.score),
 newest:(a,b)=>{const x=ageOf(a).d,y=ageOf(b).d;return(x==null?1e5:x)-(y==null?1e5:y)||(b.score-a.score)},rent:(a,b)=>a.rent_pcm-b.rent_pcm}[sortBy];return ls.slice().sort((a,b)=>(isLet(a)-isLet(b))||k(a,b))}
function lgeo(){return{type:'FeatureCollection',features:visible().filter(l=>l.lat!=null&&l.lng!=null).map(l=>{const a=ageOf(l);return{type:'Feature',geometry:{type:'Point',coordinates:[l.lng,l.lat]},properties:{id:l.id,let:isLet(l)?1:0,fresh:a.d!=null&&a.d<=7?1:0}}})}}
function buckets(){const ls=base().filter(l=>!['rejected','let'].includes(l.status)||(showLet&&isLet(l)));const mon=new Date(today0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
 const B=[{k:'now',lab:'Now',sub:'',from:TODAY,to:iso(new Date(+today0+6*DAY))}];let s=new Date(+today0+7*DAY);
 for(let i=0;i<8;i++){const e=new Date(+s+6*DAY);{const pm=i?new Date(+s-7*DAY).getMonth():today0.getMonth();B.push({k:'w'+i,lab:String(s.getDate()),sub:s.getMonth()!=pm||i==0?s.toLocaleDateString('en-GB',{month:'short'}):'',from:iso(s),to:iso(e)})}s=new Date(+e+DAY)}
 B.push({k:'later',lab:'Later',sub:'',from:iso(s),to:''});B.push({k:'unk',lab:'n/a',sub:'',from:'unknown',to:''});
 B.forEach(b=>b.n=ls.filter(l=>{const m=mvOf(l);if(b.k=='unk')return m==null;if(m==null)return false;return m>=b.from&&(!b.to||m<=b.to)}).length);return B}
function timeline(){const B=buckets(),mx=Math.max(1,...B.map(b=>b.n));
 $('tl').innerHTML=`<div class="tl-h"><span>Move-in timeline</span><em>${mvFrom||mvTo?`<button id="mvclr" class="lnk">Clear filter</button>`:'tap a bar to filter'}</em></div><div class="tl-bars">${B.map(b=>{const on=(mvFrom==b.from&&mvTo==b.to);return `<button class="tb ${on?'on':''} ${b.k=='unk'?'unk':''}" data-f="${b.from}" data-t="${b.to}" title="${b.n} listing${b.n==1?'':'s'} · ${b.k=='unk'?'move-in date not stated':b.k=='later'?'after '+fmtD(b.from):fmtD(b.from)+' – '+fmtD(b.to)}"><i style="height:${b.n?Math.max(8,b.n/mx*100):0}%"></i><b>${b.n||''}</b><span>${b.lab}<small>${b.sub||'&nbsp;'}</small></span></button>`}).join('')}</div>`;
 $$('#tl .tb').forEach(t=>t.onclick=()=>{const f=t.dataset.f,to=t.dataset.t;if(mvFrom==f&&mvTo==to){mvFrom=mvTo=''}else{mvFrom=f;mvTo=to}syncMv();listingsUI()});
 const c=$('mvclr');c&&(c.onclick=()=>{mvFrom=mvTo='';syncMv();listingsUI()})}
function syncMv(){$('mvfrom').value=mvFrom=='unknown'?'':mvFrom;$('mvto').value=mvTo}
function lsetup(){lsetupDone=true;
 $('lsort').onchange=e=>{sortBy=e.target.value;listingsUI()};
 $('mvfrom').onchange=e=>{mvFrom=e.target.value;listingsUI()};$('mvto').onchange=e=>{mvTo=e.target.value;listingsUI()};
 $('showlet').onchange=e=>{e.stopPropagation();showLet=e.target.checked;listingsUI()}}
function listingsUI(){if(!lsetupDone)lsetup();
 const live=L.filter(l=>!['let','rejected'].includes(l.status)),nLet=L.filter(isLet).length,fresh=live.filter(l=>{const a=ageOf(l);return a.d!=null&&a.d<=14}).length;
 $('lcount').textContent=live.length||'';$('letn').textContent=nLet;
 $('lsum').innerHTML=`<b>${live.length}</b> live · <b>${fresh}</b> listed in the last 14 days`;
 $('lfilter').innerHTML=STAT.map(s=>{const n=s=='active'?base().filter(l=>!['rejected','let'].includes(l.status)||(showLet&&isLet(l))).length:base().filter(l=>l.status==s).length;if(!n&&s!='active'&&s!=lfilter)return'';return `<button class="chip ${s==lfilter?'on':''}" data-s="${s}">${s=='active'?'All':s[0].toUpperCase()+s.slice(1)} ${n}</button>`}).join('');
 $$('#lfilter .chip').forEach(c=>c.onclick=()=>{lfilter=c.dataset.s;listingsUI()});
 timeline();map&&map.getSource('listings')&&map.getSource('listings').setData(lgeo());
 const ls=lsorted(visible());
 $('lcards').innerHTML=!L.length?`<div class="empty"><b>No listings yet</b>Listings added to data/listings.json will appear here and as pins on the map.</div>`:!ls.length?`<div class="empty"><b>Nothing matches</b>Try clearing the move-in filter or status.</div>`:
 ls.map(l=>{const a=ageOf(l),m=mvOf(l),srcs=(l.sources||[l.source]).length,warn=(l.flags||[]).filter(f=>/Kingston|Old St|NO pets|approximate|rent changed/.test(f));
  return `<div class="lc ${isLet(l)?'is-let':''}" data-id="${l.id}"><div class="ph" style="${l.photo?`background-image:url('${encodeURI(l.photo)}')`:''}">${l.photo?'':'<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/></svg>'}<span class="mv ${m?'':'unk'}"><small>Move in</small>${m?(m<=TODAY?'Now':fmtD(m)):'Unknown'}</span></div><div class="lb">
  <div class="pr">${gbp(l.rent_pcm)} <small>pcm${l.beds!=null?` · ${l.beds} bed`:''}${l.sqm?` · ${l.sqm} m²`:''}</small></div>
  <div class="nm" title="${esc(l.title||'')}">${esc(l.title||l.address||'')}</div>
  <div class="mt"><span>${esc(l.area||'')}${l.postcode?` · ${esc(l.postcode.split(' ')[0])}`:''}</span><span class="fr ${freshCls(a)}">${a.txt}</span></div>
  <div class="tags">${isLet(l)?`<span class="tag st st-let">let / removed${l.removed_on?' '+fmtD(l.removed_on):''}</span>`:l.status!='seen'?`<span class="tag st st-${l.status}">${l.status}</span>`:''}<span class="tag pets p-${l.pets}" title="${esc(l.pets_evidence||'Listing does not mention pets')}">🐾 ${l.pets=='unknown'?'pets ?':l.pets=='no'?'no pets':l.pets=='negotiable'?'pets considered':'pets ok'}</span>${l.furnished?`<span class="tag">${esc((s=>s.length>22?(/unfurn/i.test(s)&&/furnished or|or unf|flexible/i.test(s)?'Furn. flexible':s.slice(0,20)+'…'):s)(String(l.furnished).replace(/^Furnishing:?\s*/i,'')))}</span>`:''}${srcs>1?`<span class="tag">on ${srcs} sites</span>`:`<span class="tag">${esc(l.source)}</span>`}${l.rent_pcm>1700?`<span class="tag warn">> £1,700</span>`:''}</div>
  ${warn.length?`<div class="fl">${warn.map(esc).join(' · ')}</div>`:''}
  <div class="links">${(l.urls||[l.url]).map(u=>`<a href="${encodeURI(u)}" target="_blank" rel="noopener">${u.includes('rightmove')?'Rightmove':u.includes('onthemarket')?'OnTheMarket':u.includes('openrent')?'OpenRent':u.includes('spareroom')?'SpareRoom':'Listing'} ↗</a>`).join('')}</div></div></div>`}).join('');
 $$('.lc').forEach(c=>c.onclick=e=>{if(e.target.closest('a'))return;const l=L.find(x=>x.id==c.dataset.id);if(l&&l.lat!=null){map.flyTo({center:[l.lng,l.lat],zoom:14.5})}})}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function about(){const m=A.meta;$('about').innerHTML=`<h3>Brief</h3><div class="ctl"><p>Two adults and a cat, a sizeable one-bed. Anish ≤30 min to Old Street; KCL campuses (Waterloo, Strand, Guy's, Denmark Hill) for his girlfriend; must reach Kingston by car in under an hour on a weekday evening. Budget £1,700, £1,800 at a push.</p></div>
<h3>Sources</h3><div class="ctl"><p><b>Transit</b> · ${m.transit}.</p><p><b>Drive</b> · ${m.drive}. The traffic factor slider recomputes this live.</p><p><b>Rent</b> · ${m.rent}.</p><p style="margin:0"><b>Boundaries</b> · Postcode districts from missinglink/uk-postcode-polygons (ONS/OS open data). Each district is shaded by its best-scoring area.</p></div>
<h3>Listings</h3><div class="ctl"><p><b>Refreshed ${LG||'—'}</b> · fresh pass over Rightmove (added in last 14 days), OnTheMarket ("Added &lt; 14 days"), OpenRent (first listed ≤14 days) and SpareRoom whole-flat ads, then every listing page opened to confirm it is still live and read move-in date, pets and size. Same flat on several sites is merged (same beds, rent within £5, within 300 m).</p><p><b>Move in</b> is the listing's own "available from" date; a past date or "now" shows as Now; blank means the listing doesn't say.</p><p style="margin:0"><b>Pets</b> are exactly as the listing states (OpenRent's Pets field, SpareRoom's "Pets suitable?", or wording in the description). "pets ?" means the listing is silent, so ask the agent.</p></div><h3>Caveats</h3><div class="ctl"><ul><li>The traffic factor is assumed, not measured. Many areas sit at 52–68 min, so drive verdicts are sensitive to it.</li><li>Transit times are from one representative point per area (±5 min is plausible).</li><li>Rents are medians across all 1-bed listings per neighbourhood zone, and several areas share a zone. A sizeable or pet-friendly flat costs more.</li><li>A district takes the colour of its best area, so large districts (SE1, E1) can look better than their weaker parts.</li></ul></div><p style="color:var(--mut);font-size:12px;margin:4px">Data generated ${m.generated}.</p>`}

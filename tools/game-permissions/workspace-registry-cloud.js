(() => {
 'use strict';
 const client=window.workspaceClient;
 const kinds=['maker','category'];
 const collator=new Intl.Collator('ja',{sensitivity:'base',numeric:true});
 let entries={maker:[],category:[]};
 const normalize=v=>String(v||'').trim();
 async function load(){
  const {data,error}=await client.from('workspace_game_registry').select('kind,name').order('name');
  if(error)throw error;
  entries={maker:[],category:[]};
  for(const row of data||[])if(kinds.includes(row.kind))entries[row.kind].push(row.name);
  for(const kind of kinds)entries[kind].sort(collator.compare);
  return entries;
 }
 async function ensure(kind,name){
  name=normalize(name);
  if(!name)return;
  if(!kinds.includes(kind))throw Error('不明な登録項目です。');
  if(entries[kind].includes(name))return;
  const {error}=await client.from('workspace_game_registry').upsert({kind,name},{onConflict:'kind,name',ignoreDuplicates:true});
  if(error)throw error;
  await load();
 }
 async function rename(kind,oldName,newName){
  newName=normalize(newName);
  if(!newName||newName===oldName)return;
  if(entries[kind].includes(newName))throw Error('同じ名前が既に登録されています。');
  const {error}=await client.from('workspace_game_registry').update({name:newName}).eq('kind',kind).eq('name',oldName);
  if(error)throw error;
  await load();
 }
 async function remove(kind,name){
  const {error}=await client.from('workspace_game_registry').delete().eq('kind',kind).eq('name',name);
  if(error)throw error;
  await load();
 }
 function createSelect(input,kind){
  const holder=document.createElement('div');holder.className='registry-chooser';
  const select=document.createElement('select');select.className='registry-select';select.setAttribute('aria-label',kind==='maker'?'メーカーを選択':'カテゴリーを選択');
  const custom=document.createElement('input');custom.type='text';custom.className='registry-custom-input';custom.maxLength=kind==='maker'?200:100;custom.placeholder='新しい'+(kind==='maker'?'メーカー':'カテゴリー')+'を入力';custom.hidden=true;
  holder.append(select,custom);input.after(holder);
  let draft='';
  function draw(){
   const current=normalize(input.value);select.replaceChildren();
   const option=(value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);};
   option('__new__','＋ 新しい'+(kind==='maker'?'メーカー':'カテゴリー')+'を追加');
   option('','未設定');
   for(const name of entries[kind])option(name,name);
   if(current&&!entries[kind].includes(current))option(current,current);
   select.value=current;
   if(![...select.options].some(o=>o.value===current))select.value='';
   custom.hidden=true;custom.value='';draft='';
  }
  select.addEventListener('change',()=>{
   if(select.value==='__new__'){
    custom.hidden=false;custom.value=draft;custom.focus();
    input.value=normalize(custom.value);
   }else{
    custom.hidden=true;custom.value='';draft='';input.value=select.value;
   }
   input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  custom.addEventListener('input',()=>{draft=custom.value;input.value=normalize(draft);input.dispatchEvent(new Event('change',{bubbles:true}));});
  input.addEventListener('registry-refresh',draw);
  input.closest('form')?.addEventListener('reset',()=>setTimeout(draw,0));
  draw();return draw;
 }
 function chooser(prefix,kind){
  const input=document.getElementById(prefix+'-'+kind);
  if(!input||input.dataset.registryReady)return;
  input.dataset.registryReady='1';input.type='hidden';input.removeAttribute('list');
  return createSelect(input,kind);
 }
 function refresh(){for(const prefix of ['review','direct'])for(const kind of kinds)document.getElementById(prefix+'-'+kind)?.dispatchEvent(new Event('registry-refresh'));}
 async function saveChoices(details){for(const kind of kinds)await ensure(kind,details[kind]);refresh();}
 window.workspaceRegistry={load,ensure,rename,remove,chooser,createSelect,refresh,saveChoices,entries:()=>entries};
})();

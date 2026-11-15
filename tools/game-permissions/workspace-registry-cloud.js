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
 function chooser(prefix,kind){
  const input=document.getElementById(prefix+'-'+kind);
  if(!input||input.dataset.registryReady)return;
  input.dataset.registryReady='1';
  input.type='hidden';input.removeAttribute('list');
  const holder=document.createElement('div');holder.className='registry-chooser';
  const options=document.createElement('div');options.className='registry-choices';
  const row=document.createElement('div');row.className='registry-custom-row';
  const custom=document.createElement('input');custom.type='text';custom.maxLength=kind==='maker'?200:100;custom.placeholder=(kind==='maker'?'メーカー':'カテゴリー')+'を直接入力';
  const add=document.createElement('button');add.type='button';add.textContent='入力した項目を選択';
  row.append(custom,add);holder.append(options,row);input.after(holder);
  function draw(){
   options.replaceChildren();
   const choices=['',...entries[kind]];
   if(input.value&&!choices.includes(input.value))choices.push(input.value);
   for(const name of choices){
    const b=document.createElement('button');b.type='button';b.textContent=name||'未設定';b.className='registry-choice';
    b.setAttribute('aria-pressed',String(input.value===name));
    b.addEventListener('click',()=>{input.value=name;draw();input.dispatchEvent(new Event('change',{bubbles:true}));});options.append(b);
   }
  }
  add.addEventListener('click',()=>{const name=normalize(custom.value);if(!name)return;input.value=name;custom.value='';draw();input.dispatchEvent(new Event('change',{bubbles:true}));});
  custom.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add.click();}});
  input.addEventListener('registry-refresh',draw);
  input.closest('form')?.addEventListener('reset',()=>setTimeout(draw,0));
  draw();
  return draw;
 }
 function refresh(){for(const prefix of ['review','direct'])for(const kind of kinds)document.getElementById(prefix+'-'+kind)?.dispatchEvent(new Event('registry-refresh'));}
 async function saveChoices(details){for(const kind of kinds)await ensure(kind,details[kind]);refresh();}
 window.workspaceRegistry={load,ensure,rename,remove,chooser,refresh,saveChoices,entries:()=>entries};
})();

(() => {
 'use strict';
 const client=window.workspaceClient;
 const page=document.body.dataset.page;
 const $=id=>document.getElementById(id);
 const operators=['engineer','admin','staff'];
 const fields=['entryType','title','maker','scopeType','scopeName','category','store-url','official-url','coverage-notes','required-text','recommended-text','superchat','monetize','source','source-url'];
 const pendingStatuses=['未確認','確認中','申請中'];
 let records=[],isOperator=false,uid='',favoriteKeys=new Set(),applicantNames=new Map();
 const applicantName=record=>{
  const d=record.details||{};
  return applicantNames.get(d.applicantId)||d.applicantName||d.applicantId||'申請者未設定';
 };
 async function loadApplicantNames(){
  if(!isOperator)return;
  const {data,error}=await client.rpc('workspace_list_discord_members');
  if(error){console.warn('申請者名を取得できませんでした:',error.message);return;}
  applicantNames=new Map((Array.isArray(data)?data:[])
   .filter(member=>member.auth_user_id&&member.display_name)
   .map(member=>[member.auth_user_id,member.display_name]));
 }
 const text=(node,tag,value)=>{const e=document.createElement(tag);e.textContent=value??'';node.append(e);return e};
 const notice=(message,error=false)=>{let e=$('workspace-sync-status');if(!e){e=document.createElement('p');e.id='workspace-sync-status';document.querySelector('main').prepend(e)}e.textContent=message;e.style.color=error?'#b45309':''};
 const title=r=>r.details.entryType==='maker'?`【${r.details.maker||'メーカー未設定'}】${r.details.scopeType==='series'?(r.details.scopeName||'特定シリーズ'):r.details.scopeType==='partial'?'一部タイトル':'全タイトル'}`:r.details.title||'タイトル未設定';
 const value=(prefix,field)=>$(prefix+'-'+({'scopeType':'scope','scopeName':'scope-name'}[field]||field))?.value?.trim()||'';
 const detailFields=[['メーカー','maker'],['カテゴリ','category'],['配信条件','coverage-notes'],['必須記載事項','required-text'],['推奨記載事項','recommended-text'],['スパチャ・スパステ','superchat'],['収益化','monetize'],['根拠','source'],['参照URL','source-url'],['ゲームストア','store-url'],['公式サイト','official-url']];
 const urlLink=(container,label,v)=>{try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol))return;const a=text(container,'a',label+'を開く');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer'}catch{}};
 const button=(parent,label,fn)=>{const b=text(parent,'button',label);b.type='button';b.addEventListener('click',fn);return b};
 async function load(){
  const {data,error}=await client.from('workspace_game_records').select('id,application_id,status,details,created_at,updated_at').order('created_at',{ascending:false}).limit(1000);
  if(error)throw error;records=data||[];
  const {data:f,error:fe}=await client.from('workspace_game_favorites').select('game_key').eq('auth_user_id',uid);
  if(!fe)favoriteKeys=new Set((f||[]).map(x=>x.game_key));
  render();notice('Supabaseと同期しました。');
 }
 async function persist(record,details,status){
  if(!isOperator)return;
  const payload={details,status};
  const query=record?client.from('workspace_game_records').update(payload).eq('id',record.id):client.from('workspace_game_records').insert(payload);
  const {error}=await query;if(error)throw error;await load();
 }
 async function remove(record){
  if(!isOperator||!confirm(`「${title(record)}」を削除しますか？`))return;
  try{const {error}=await client.from('workspace_game_records').delete().eq('id',record.id);if(error)throw error;await load()}catch(e){notice('削除失敗：'+e.message,true)}
 }
 function populate(record){
  const d=record.details;
  for(const field of fields){const id='review-'+({'scopeType':'scope','scopeName':'scope-name'}[field]||field);if($(id))$(id).value=d[field]||''}
  for(const [id,val] of [['review-id',record.id],['status',record.status],['review-applicant',applicantName(record)],['review-created-at',d.createdAt||record.created_at],['review-stream-date',d['stream-date']||''],['review-request-note',d['request-note']||'']])if($(id))$(id).value=val;
  toggleScope('review');$('review-form')?.scrollIntoView({behavior:'smooth'});
 }
 function toggleScope(prefix){const maker=value(prefix,'entryType')==='maker';
  document.querySelector(`.individual-title-field[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',maker);
  document.querySelector(`.maker-scope-fields[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',!maker);
  document.querySelector(`.maker-custom-scope[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',value(prefix,'scopeType')!=='series');
 }
 function card(parent,record){
  const card=text(parent,'article','');card.className='permission-entry';text(card,'h3',title(record));text(card,'p','許諾状況：'+record.status);
  if(page==='pending'){
   text(card,'p','申請者：'+(applicantName(record)));
   text(card,'p','備考：'+(record.details['request-note']||'なし'));
   const actions=text(card,'div','');actions.className='permission-actions';
   button(actions,'編集',()=>populate(record));button(actions,'削除',()=>remove(record));return;
  }
  const actions=text(card,'div','');actions.className='permission-actions';
  const detail=text(card,'section','');detail.className='approved-detail';detail.hidden=true;
  button(actions,'詳細',()=>{detail.hidden=!detail.hidden;if(detail.hidden)return;detail.replaceChildren();
   for(const [label,key] of detailFields){const v=record.details[key];if(!v)continue;
    if(label.includes('URL')||['ゲームストア','公式サイト'].includes(label))urlLink(detail,label,v);else text(detail,'p',label+'：'+v)}
   if(isOperator)button(detail,'編集',()=>editApproved(record,detail));
  });
  const fav=button(actions,favoriteKeys.has(record.id)?'お気に入り解除':'お気に入り登録',async()=>{
   const on=favoriteKeys.has(record.id);
   const q=on?client.from('workspace_game_favorites').delete().eq('auth_user_id',uid).eq('game_key',record.id):client.from('workspace_game_favorites').upsert({auth_user_id:uid,game_key:record.id});
   const {error}=await q;if(error)notice('お気に入り保存失敗：'+error.message,true);else await load();
  });
  if(isOperator)button(actions,'削除',()=>remove(record));
 }
 function editApproved(record,container){
  const form=text(container,'form','');form.className='permission-form';
  const labels={entryType:'登録対象',title:'ゲームタイトル',maker:'メーカー',scopeType:'許諾範囲',scopeName:'対象シリーズ名',category:'カテゴリ','store-url':'ストアURL','official-url':'公式サイト','coverage-notes':'注意事項','required-text':'必須記載事項','recommended-text':'推奨記載事項',superchat:'スパチャ・スパステ',monetize:'収益化',source:'許諾根拠','source-url':'参照URL'};
  for(const field of fields){const label=text(form,'label',labels[field]);const input=text(label,['coverage-notes','required-text','recommended-text'].includes(field)?'textarea':'input','');input.dataset.field=field;input.value=record.details[field]||'';}
  const statusLabel=text(form,'label','許諾状況');const status=text(statusLabel,'select','');for(const s of [...pendingStatuses,'条件付き','許諾済み','不可']){const opt=text(status,'option',s);opt.value=s}status.value=record.status;
  const submit=text(form,'button','保存');submit.type='submit';
  form.addEventListener('submit',async e=>{e.preventDefault();const d={...record.details};for(const input of form.querySelectorAll('[data-field]'))d[input.dataset.field]=input.value.trim();
   try{await persist(record,d,status.value)}catch(err){notice('保存失敗：'+err.message,true)}});
 }
 function render(){
  if(page==='pending'){
   const list=$('pending-list');list.replaceChildren();const items=records.filter(r=>pendingStatuses.includes(r.status));
   for(const r of items)card(list,r);if(!items.length)text(list,'p','許諾中の案件はありません。');
   if($('pending-count'))$('pending-count').textContent=items.length+'件';if($('pending-tab-count'))$('pending-tab-count').textContent=items.length;
  }else{
   const list=$('game-list'),maker=$('maker-game-list');list.replaceChildren();maker.replaceChildren();
   const q=($('search')?.value||'').toLowerCase(),cat=$('category-filter')?.value||'',only=$('favorites-only')?.checked;
   const cats=[...new Set(records.map(r=>r.details.category).filter(Boolean))].sort();const select=$('category-filter');if(select){const selected=select.value;select.replaceChildren();const all=text(select,'option','すべてのカテゴリ');all.value='';for(const c of cats){const o=text(select,'option',c);o.value=c}select.value=selected}
   for(const r of records.filter(r=>!pendingStatuses.includes(r.status))){const d=r.details;
    if(q&&!`${title(r)} ${d.maker||''}`.toLowerCase().includes(q))continue;
    if(cat&&d.category!==cat)continue;if(only&&!favoriteKeys.has(r.id))continue;
    card(d.entryType==='maker'?maker:list,r);
   }
  }
 }
 async function init(){
  const access=await window.workspaceAccess();if(!access.role)return;
  isOperator=operators.includes(access.role);uid=access.user.id;
  if(page==='pending'&&!isOperator)return;
  for(const prefix of ['review','direct'])for(const suffix of ['entry-type','scope','maker'])$(prefix+'-'+suffix)?.addEventListener('change',()=>toggleScope(prefix));
  for(const prefix of ['review','direct'])toggleScope(prefix);
  if(page==='pending'){
   const tabs=[ $('tab-pending'),$('tab-add') ],panels=[ $('pending-panel'),$('direct-add-section') ];
   tabs.forEach((tab,i)=>tab?.addEventListener('click',()=>{tabs.forEach((t,j)=>{t.setAttribute('aria-selected',String(i===j));panels[j].hidden=i!==j})}));
   $('review-form')?.addEventListener('submit',async e=>{e.preventDefault();const record=records.find(r=>r.id===$('review-id').value);if(!record)return notice('編集する案件を選択してください。',true);
    const d={...record.details};for(const field of fields)d[field]=value('review',field);if(d.entryType==='maker'&&!d.maker)return notice('メーカー名が必要です。',true);
    try{await persist(record,d,$('status').value);$('review-form').reset();$('review-id').value=''}catch(err){notice('保存失敗：'+err.message,true)}
   });
   $('direct-add-form')?.addEventListener('submit',async e=>{e.preventDefault();const d={};for(const field of fields)d[field]=value('direct',field);
    if(d.entryType==='maker'?!d.maker:!d.title&&!d.maker)return notice('ゲーム名またはメーカー名を入力してください。',true);
    d.registrationType='direct';d.createdAt=new Date().toISOString();d.applicantId=uid;d.applicantName='運営による直接登録';
    try{await persist(null,d,value('direct','status')||'未確認');$('direct-add-form').reset()}catch(err){notice('登録失敗：'+err.message,true)}
   });
  }else{for(const id of ['search','category-filter','favorites-only'])$(id)?.addEventListener('input',render)}
  try{await loadApplicantNames();await load()}catch(err){notice('データ取得失敗：'+err.message,true)}
 }
 init();
})();

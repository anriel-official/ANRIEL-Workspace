(() => {
 'use strict';
 const client=window.workspaceClient;
 const page=document.body.dataset.page;
 const $=id=>document.getElementById(id);
 const operators=['engineer','admin','staff'];
 const fields=['entryType','title','maker','scopeType','scopeName','category','store-url','official-url','coverage-notes','stream-end-date','required-text','recommended-text','superchat','monetize','source','source-url'];
 const pendingStatuses=['未確認','確認中','申請中'];
 let records=[],isOperator=false,uid='',favoriteKeys=new Set(),applicantNames=new Map();
 const applicantName=record=>{
  const d=record.details||{};
  return applicantNames.get(d.applicantId)||((d.applicantName && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(d.applicantName)) ? d.applicantName : '')||'申請者未設定';
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
 const value=(prefix,field)=>$(prefix==='review'&&['required-text','recommended-text','superchat','status','monetize','source','source-url'].includes(field)?field:prefix+'-'+({'scopeType':'scope','scopeName':'scope-name'}[field]||field))?.value?.trim()||'';
 const expiryText=d=>{const date=d['stream-end-date'];if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '';const [y,m,day]=date.split('-').map(Number);const valid=new Date(Date.UTC(y,m-1,day));if(valid.getUTCFullYear()!==y||valid.getUTCMonth()!==m-1||valid.getUTCDate()!==day)return '';return `${y}.${String(m).padStart(2,'0')}.${String(day).padStart(2,'0')}まで可能`;};
 const syncPeriod=prefix=>{const check=$(prefix+'-stream-period-enabled'),date=$(prefix+'-stream-end-date');if(check&&date){date.disabled=!check.checked;if(!check.checked)date.value='';}};
 const periodValue=prefix=>$(prefix+'-stream-period-enabled')?.checked?value(prefix,'stream-end-date'):'';
 const detailFields=[['登録対象','entryType'],['ゲームタイトル','title'],['メーカー','maker'],['カテゴリ','category'],['ゲームストアURL','store-url'],['ゲーム公式サイト','official-url'],['必須記載事項','required-text'],['推奨記載事項','recommended-text'],['特記事項','coverage-notes'],['配信期限','stream-end-date'],['スパチャ・スパステ','superchat'],['収益化','monetize'],['許諾の根拠','source'],['参照URL','source-url']];
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
  await window.workspaceRegistry.saveChoices(details);
  await window.workspaceRegistry?.saveChoices(details);
  const payload={details,status};
  const query=record?client.from('workspace_game_records').update(payload).eq('id',record.id):client.from('workspace_game_records').insert(payload);
  const {error}=await query;if(error)throw error;await load();
 }
 const notificationMembers=async()=>{
  const {data,error}=await client.rpc('workspace_list_discord_members');
  if(error)throw error;
  return (Array.isArray(data)?data:[]).filter(m=>m.discord_id&&m.display_name);
 };
 async function notificationControls(form){
  const panel=text(form,'fieldset','');panel.className='permission-discord-notify';
  text(panel,'legend','Discord通知（任意）');
  const label=text(panel,'label','');label.className='permission-notify-toggle';
  const enabled=text(label,'input','');enabled.type='checkbox';
  text(label,'span','保存後にDiscordへ通知する');
  const options=text(panel,'div','');options.hidden=true;
  const memberBox=text(options,'div','');memberBox.className='permission-notify-members';
  text(options,'p','メンションするメンバー（複数選択可・未選択ならメンションなし）');
  const noteLabel=text(options,'label','追加メッセージ（任意）');
  const note=text(noteLabel,'textarea','');note.maxLength=500;note.rows=2;
  enabled.addEventListener('change',()=>{options.hidden=!enabled.checked});
  try{
   const members=await notificationMembers();
   for(const m of members){
    const row=text(memberBox,'label','');row.className='permission-notify-member';
    const check=text(row,'input','');check.type='checkbox';check.value=String(m.discord_id);
    text(row,'span',m.display_name);
   }
   if(!members.length)text(memberBox,'p','メンションできる登録メンバーがいません。');
  }catch(e){text(memberBox,'p','メンバー取得に失敗しました。通知はメンションなしで送れます。');}
  return ()=>enabled.checked?{memberIds:[...memberBox.querySelectorAll('input:checked')].map(x=>x.value),message:note.value.trim()}:null;
 }
 async function sendPermissionNotification(recordId,selection){
  if(!selection)return;
  const {data,error}=await client.functions.invoke('notify-game-permission',{body:{recordId,memberIds:selection.memberIds,message:selection.message}});
  if(error||!data?.notified)throw Error(data?.error||error?.message||'Discord通知に失敗しました。');
 }
 async function remove(record){
  if(!isOperator)return;
  if(!confirm(`「${title(record)}」を完全に削除しますか？\n関連する申請・お気に入り・個人メモ・通知待ちデータも削除されます。\nこの操作は元に戻せません。`))return;
  try{
   const {data,error}=await client.rpc('workspace_delete_game_permanently',{p_record_id:record.id});
   if(error)throw error;
   if(data!==true)throw Error('削除が完了しませんでした。');
   await load();notice('ゲームと関連データをデータベースから完全に削除しました。');
  }catch(e){notice('削除失敗：'+e.message,true)}
 }
 function populate(record){
  const d=record.details;
  for(const field of fields){const id=['required-text','recommended-text','superchat','monetize','source','source-url'].includes(field)?field:'review-'+({'scopeType':'scope','scopeName':'scope-name'}[field]||field);if($(id))$(id).value=d[field]||''}
  for(const [id,val] of [['review-id',record.id],['status',record.status],['review-applicant',applicantName(record)],['review-created-at',d.createdAt||record.created_at],['review-stream-date',d['stream-date']||''],['review-request-note',d['request-note']||'']])if($(id))$(id).value=val;
  window.workspaceRegistry.refresh();
  if($('review-stream-period-enabled'))$('review-stream-period-enabled').checked=Boolean(d['stream-end-date']);syncPeriod('review');
  window.workspaceRegistry?.refresh();toggleScope('review');$('review-form')?.scrollIntoView({behavior:'smooth'});
 }
 function toggleScope(prefix){const maker=value(prefix,'entryType')==='maker';
  document.querySelector(`.individual-title-field[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',maker);
  document.querySelector(`.maker-scope-fields[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',!maker);
  document.querySelector(`.maker-custom-scope[data-prefix="${prefix}"]`)?.toggleAttribute('hidden',value(prefix,'scopeType')!=='series');
 }
 function card(parent,record){
  const card=text(parent,'article','');card.className='permission-entry';const heading=text(card,'h3','');heading.className='game-title-heading';text(heading,'span',title(record));if(page==='approved'&&expiryText(record.details)){const badge=text(heading,'span',expiryText(record.details));badge.className='stream-period-badge';}text(card,'p','許諾状況：'+record.status);
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
    if(key==='stream-end-date')text(detail,'p',label+'：'+expiryText(record.details));else if(key==='entryType')text(detail,'p',label+'：'+(v==='maker'?'メーカー全タイトル':'個別ゲーム'));else if(label.includes('URL'))urlLink(detail,label,v);else text(detail,'p',label+'：'+v)}
   if(isOperator)button(detail,'編集',()=>editApproved(record,detail));
  });
  const fav=button(actions,favoriteKeys.has(record.id)?'お気に入り解除':'お気に入り登録',async()=>{
   const on=favoriteKeys.has(record.id);
   const q=on?client.from('workspace_game_favorites').delete().eq('auth_user_id',uid).eq('game_key',record.id):client.from('workspace_game_favorites').upsert({auth_user_id:uid,game_key:record.id});
   const {error}=await q;if(error)notice('お気に入り保存失敗：'+error.message,true);else await load();
  });
  if(isOperator)button(actions,'削除',()=>remove(record));
 }
 async function editApproved(record,container){
  // Repeated clicks must not append duplicate edit forms.
  if(container.querySelector('form.permission-form'))return;
  const form=text(container,'form','');form.className='permission-form';
  const labels={entryType:'登録対象',title:'ゲームタイトル',maker:'メーカー',scopeType:'許諾範囲',scopeName:'対象シリーズ名',category:'カテゴリ','store-url':'ゲームストアURL','official-url':'ゲーム公式サイト','coverage-notes':'特記事項','stream-end-date':'配信期限','required-text':'必須記載事項','recommended-text':'推奨記載事項',superchat:'スパチャ・スパステ',monetize:'収益化',source:'許諾根拠','source-url':'参照URL'};
  const orderedFields=['entryType','title','maker','category','store-url','official-url','required-text','recommended-text','coverage-notes','stream-end-date','scopeType','scopeName','superchat','monetize','source','source-url'];
  const choices={
   superchat:['未確認','OK','NG'],
   monetize:['未確認','可能','条件付き','不可'],
   source:['未確認','公式ガイドライン','個別許諾']
  };
  const makeSelect=(field,options)=>{
   const label=text(form,'label',labels[field]);
   const select=text(label,'select','');
   select.dataset.field=field;
   for(const option of options){const node=text(select,'option',option);node.value=option;}
   const current=record.details[field]||'';
   if(current&&!options.includes(current)){const node=text(select,'option',current);node.value=current;}
   select.value=current||options[0];
   return select;
  };
  for(const field of orderedFields){
   if(choices[field]){makeSelect(field,choices[field]);continue;}
   const label=text(form,'label',labels[field]);
   const input=text(label,['coverage-notes','required-text','recommended-text'].includes(field)?'textarea':'input','');
   input.dataset.field=field;input.value=record.details[field]||'';
   if(field==='stream-end-date')input.type='date';
   if(field==='entryType')input.readOnly=true;
   if(['maker','category'].includes(field)){input.type='hidden';window.workspaceRegistry.createSelect(input,field);}
  }
  const statusLabel=text(form,'label','許諾状況');
  const status=text(statusLabel,'select','');
  for(const s of [...pendingStatuses,'条件付き','許諾済み','不可']){
   const opt=text(status,'option',s);opt.value=s;
  }
  status.value=record.status;
  const getNotification=await notificationControls(form);
  const submit=text(form,'button','保存');submit.type='submit';
  form.addEventListener('submit',async e=>{e.preventDefault();const d={...record.details};for(const input of form.querySelectorAll('[data-field]'))d[input.dataset.field]=input.value.trim();
   try{const selected=getNotification();await persist(record,d,status.value);try{await sendPermissionNotification(record.id,selected);if(selected)notice('保存してDiscordへ通知しました。')}catch(e){notice('保存しましたが通知に失敗しました：'+e.message,true)}}catch(err){notice('保存失敗：'+err.message,true)}});
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
  for(const prefix of ['review','direct']){toggleScope(prefix);$(prefix+'-stream-period-enabled')?.addEventListener('change',()=>syncPeriod(prefix));syncPeriod(prefix);}
  if(page==='pending'){
   const tabs=[ $('tab-pending'),$('tab-add') ],panels=[ $('pending-panel'),$('direct-add-section') ];
   tabs.forEach((tab,i)=>tab?.addEventListener('click',()=>{tabs.forEach((t,j)=>{t.setAttribute('aria-selected',String(i===j));panels[j].hidden=i!==j})}));
   const reviewNotify=await notificationControls($('review-form'));
   $('review-form')?.addEventListener('submit',async e=>{e.preventDefault();const record=records.find(r=>r.id===$('review-id').value);if(!record)return notice('編集する案件を選択してください。',true);
    const d={...record.details};for(const field of fields)d[field]=field==='stream-end-date'?periodValue('review'):value('review',field);if(d.entryType==='maker'&&!d.maker)return notice('メーカー名が必要です。',true);
    try{const selected=reviewNotify();await persist(record,d,$('status').value);$('review-form').reset();$('review-id').value='';window.scrollTo({top:0,behavior:'smooth'});notice('保存しました。');try{await sendPermissionNotification(record.id,selected);if(selected)notice('保存してDiscordへ通知しました。')}catch(e){notice('保存しましたがDiscord通知に失敗しました：'+e.message,true)}}catch(err){notice('保存失敗：'+err.message,true)}
   });
   $('direct-add-form')?.addEventListener('submit',async e=>{e.preventDefault();const d={};for(const field of fields)d[field]=field==='stream-end-date'?periodValue('direct'):value('direct',field);
    if(d.entryType==='maker'?!d.maker:!d.title&&!d.maker)return notice('ゲーム名またはメーカー名を入力してください。',true);
    d.registrationType='direct';d.createdAt=new Date().toISOString();d.applicantId=uid;d.applicantName='運営による直接登録';
    try{await persist(null,d,value('direct','status')||'未確認');$('direct-add-form').reset()}catch(err){notice('登録失敗：'+err.message,true)}
   });
  }else{for(const id of ['search','category-filter','favorites-only'])$(id)?.addEventListener('input',render)}
  try{await window.workspaceRegistry.load();for(const prefix of ['review','direct'])for(const kind of ['maker','category'])window.workspaceRegistry.chooser(prefix,kind);await loadApplicantNames();await load()}catch(err){notice('データ取得失敗：'+err.message,true)}
 }
 init();
})();

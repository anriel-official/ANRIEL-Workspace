(() => {
 'use strict';
 async function init(){
  const client=window.workspaceClient;
  const access=await window.workspaceAccess();
  if(!access.user)return;
  const uid=access.user.id, list=document.getElementById('personal-list'), status=document.getElementById('personal-status');
  const key=document.getElementById('personal-game-key'),note=document.getElementById('personal-note'),favorite=document.getElementById('personal-favorite');
  async function refresh(){
   const [f,n,g]=await Promise.all([
    client.from('workspace_game_favorites').select('game_key').eq('auth_user_id',uid),
    client.from('workspace_game_personal_notes').select('game_key,note').eq('auth_user_id',uid),
    client.from('workspace_game_records').select('id,status,details').limit(1000)
   ]);
   if(f.error||n.error){status.textContent='個人データを取得できません。';return;}
   const favs=new Set((f.data||[]).map(x=>x.game_key));
   const notes=new Map((n.data||[]).map(x=>[x.game_key,x.note]));
   const games=new Map((g.data||[]).map(x=>[String(x.id),x]));
   list.replaceChildren();
   for(const k of new Set([...favs,...notes.keys()])){
    const row=document.createElement('p');
    const game=games.get(String(k));
    const d=game?.details||{};
    const gameTitle=d.entryType==='maker'
     ? `【${d.maker||'メーカー未設定'}】${d.scopeType==='series'?(d.scopeName||'特定シリーズ'):d.scopeType==='partial'?'一部タイトル':'全タイトル'}`
     : (d.title||k);
    row.textContent=`${gameTitle}${game?'　｜　'+game.status:''}${notes.get(k)?'　｜　'+notes.get(k):''}　`;
    if(game){const a=document.createElement('a');a.href='approved.html';a.textContent='ゲーム一覧で確認';row.append(a);}
    const edit=document.createElement('button');edit.textContent='編集';
    edit.onclick=()=>{key.value=k;note.value=notes.get(k)||'';favorite.checked=favs.has(k);key.focus()};
    row.append(edit);list.append(row);
   }
  }
  document.getElementById('personal-data-form').addEventListener('submit',async e=>{
   e.preventDefault();const k=key.value.trim();if(!k)return;
   let err;
   if(favorite.checked)({error:err}=await client.from('workspace_game_favorites').upsert({auth_user_id:uid,game_key:k}));
   else ({error:err}=await client.from('workspace_game_favorites').delete().eq('auth_user_id',uid).eq('game_key',k));
   if(!err){
    if(note.value.trim())({error:err}=await client.from('workspace_game_personal_notes').upsert({auth_user_id:uid,game_key:k,note:note.value.trim(),updated_at:new Date().toISOString()}));
    else ({error:err}=await client.from('workspace_game_personal_notes').delete().eq('auth_user_id',uid).eq('game_key',k));
   }
   status.textContent=err?'保存できませんでした。':'保存しました。';
   if(!err)await refresh();
  });
  await refresh();
 }
 document.addEventListener('DOMContentLoaded',()=>init().catch(()=>{}));
})();
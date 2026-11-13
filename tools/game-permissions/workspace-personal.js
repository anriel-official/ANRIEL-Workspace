(() => {
 'use strict';
 async function init(){
  const client=window.workspaceClient;
  const access=await window.workspaceAccess();
  if(!access.user)return;
  const uid=access.user.id, list=document.getElementById('personal-list'), status=document.getElementById('personal-status');
  const key=document.getElementById('personal-game-key'),note=document.getElementById('personal-note'),favorite=document.getElementById('personal-favorite');
  async function refresh(){
   const [f,n]=await Promise.all([
    client.from('workspace_game_favorites').select('game_key').eq('auth_user_id',uid),
    client.from('workspace_game_personal_notes').select('game_key,note').eq('auth_user_id',uid)
   ]);
   if(f.error||n.error){status.textContent='個人データを取得できません。';return;}
   const favs=new Set((f.data||[]).map(x=>x.game_key));
   const notes=new Map((n.data||[]).map(x=>[x.game_key,x.note]));
   list.replaceChildren();
   for(const k of new Set([...favs,...notes.keys()])){
    const row=document.createElement('p');
    row.textContent=`${k}　${favs.has(k)?'お気に入り　':''}${notes.get(k)||''}　`;
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
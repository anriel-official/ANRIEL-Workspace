(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const text=(el,tag,value)=>{const node=document.createElement(tag);node.textContent=value;el.append(node);return node};
 async function init(){
  const client=window.workspaceClient, access=await window.workspaceAccess();
  if(!access.user)return;
  const uid=access.user.id, list=$('personal-list'), status=$('personal-status');
  async function refreshFavorites(){
   const [f,g]=await Promise.all([
    client.from('workspace_game_favorites').select('game_key').eq('auth_user_id',uid),
    client.from('workspace_game_records').select('id,status,details').limit(1000)
   ]);
   if(f.error){status.textContent='お気に入りを取得できません：'+f.error.message;return;}
   const games=new Map((g.data||[]).map(x=>[String(x.id),x]));
   list.replaceChildren();
   if(!(f.data||[]).length){text(list,'p','お気に入りのゲームはありません。');return;}
   for(const item of f.data){
    const k=String(item.game_key),game=games.get(k),d=game?.details||{};
    const title=game?(d.entryType==='maker'?`【${d.maker||'メーカー未設定'}】${d.scopeType==='series'?(d.scopeName||'特定シリーズ'):d.scopeType==='partial'?'一部タイトル':'全タイトル'}`:(d.title||k)):k;
    const row=document.createElement('div');row.className='workspace-favorite-row';
    const info=document.createElement('div');info.className='workspace-favorite-info';text(info,'strong',title);
    if(game)text(info,'small',game.status||'');
    const btn=text(row,'button','お気に入り解除');btn.type='button';btn.className='workspace-unfavorite';
    btn.onclick=async()=>{
     if(btn.disabled)return;btn.disabled=true;
     const {error}=await client.from('workspace_game_favorites').delete().eq('auth_user_id',uid).eq('game_key',k);
     if(error){status.textContent='解除できません：'+error.message;btn.disabled=false;return;}
     status.textContent='お気に入りを解除しました。';await refreshFavorites();
    };
    row.prepend(info);list.append(row);
   }
  }
  async function refreshMemos(){
   const {data,error}=await client.from('workspace_user_memos').select('id,title,body,updated_at').eq('auth_user_id',uid).order('updated_at',{ascending:false});
   if(error){$('memo-status').textContent='メモを取得できません：'+error.message;return;}
   const memos=data||[];$('memo-count').textContent=`${memos.length} / 10`;
   $('memo-save').disabled=!$('memo-id').value&&memos.length>=10;
   const target=$('memo-list');target.replaceChildren();
   if(!memos.length)text(target,'p','メモはまだありません。');
   for(const memo of memos){
    const row=document.createElement('article');row.className='workspace-memo-item';
    text(row,'h3',memo.title);text(row,'p',memo.body);
    const actions=document.createElement('div');actions.className='permission-actions';
    const edit=text(actions,'button','編集');edit.type='button';edit.onclick=()=>{
     $('memo-id').value=memo.id;$('memo-title').value=memo.title;$('memo-body').value=memo.body;
     $('memo-save').disabled=false;$('memo-cancel').hidden=false;$('memo-title').focus();
    };
    const del=text(actions,'button','削除');del.type='button';del.onclick=async()=>{
     if(!confirm('このメモを削除しますか？'))return;
     const {error:e}=await client.from('workspace_user_memos').delete().eq('id',memo.id).eq('auth_user_id',uid);
     if(e){$('memo-status').textContent='削除できません：'+e.message;return;}
     if($('memo-id').value===memo.id)resetForm();await refreshMemos();
    };
    row.append(actions);target.append(row);
   }
  }
  function resetForm(){ $('memo-form').reset();$('memo-id').value='';$('memo-cancel').hidden=true;$('memo-save').disabled=false; }
  $('memo-cancel').onclick=async()=>{resetForm();await refreshMemos();};
  $('memo-form').addEventListener('submit',async e=>{
   e.preventDefault();const id=$('memo-id').value,title=$('memo-title').value.trim(),body=$('memo-body').value.trim();
   if(!title||!body)return;
   $('memo-save').disabled=true;
   const q=id?client.from('workspace_user_memos').update({title,body}).eq('id',id).eq('auth_user_id',uid):client.from('workspace_user_memos').insert({auth_user_id:uid,title,body});
   const {error}=await q;
   if(error){$('memo-status').textContent='保存できません：'+error.message;$('memo-save').disabled=false;return;}
   $('memo-status').textContent='メモを保存しました。';resetForm();await refreshMemos();
  });
  await Promise.all([refreshFavorites(),refreshMemos()]);
 }
 document.addEventListener('DOMContentLoaded',()=>init().catch(e=>{if($('personal-status'))$('personal-status').textContent=e.message;}));
})();

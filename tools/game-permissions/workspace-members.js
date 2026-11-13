(() => {
 'use strict';
 const roleNames={engineer:'エンジニア',admin:'管理者',staff:'スタッフ',talent:'タレント'};
 const create=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
 async function boot(){
  const output=document.getElementById('member-result'),list=document.getElementById('member-list');
  const access=await window.workspaceAccess();
  if(!['engineer','admin','staff'].includes(access.role))return;
  const client=window.workspaceClient;
  async function rpc(name,args){const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message);return data;}
  function status(message){output.textContent=message;}
  function editRow(member){
   const row=create('form','workspace-member-edit');
   const nameLabel=create('label',null,'名前');const name=create('input');name.value=member.display_name||'';name.required=true;name.maxLength=100;nameLabel.append(name);
   const roleLabel=create('label',null,'役職');const role=create('select');
   for(const [key,value] of Object.entries(roleNames)){const opt=create('option',null,value);opt.value=key;opt.selected=member.role===key;role.append(opt);}roleLabel.append(role);
   const save=create('button','workspace-primary-button','保存');save.type='submit';
   const cancel=create('button','workspace-secondary-button','キャンセル');cancel.type='button';cancel.addEventListener('click',refresh);
   const actions=create('div','workspace-member-actions');actions.append(save,cancel);row.append(nameLabel,roleLabel,actions);
   row.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{await rpc('workspace_update_discord_member',{p_discord_id:member.discord_id,p_display_name:name.value.trim(),p_role:role.value,p_enabled:member.enabled});status('メンバー情報を更新しました。');await refresh();}catch(e){status('更新できませんでした：'+e.message);save.disabled=false;}});
   return row;
  }
  async function refresh(){
   try{
    const members=await rpc('workspace_list_discord_members');list.replaceChildren();
    if(!members?.length){list.append(create('p','workspace-empty','登録メンバーはいません。'));return;}
    for(const member of members){
     const row=create('article','workspace-member-row');
     const identity=create('div','workspace-member-identity');
     identity.append(create('strong','workspace-member-name',member.display_name||'名前未設定'));
     identity.append(create('span','workspace-member-id','Discord ID：'+member.discord_id));
     const meta=create('div','workspace-member-meta');meta.append(create('span','workspace-role',roleNames[member.role]||member.role));
     meta.append(create('span',member.enabled?'workspace-enabled':'workspace-disabled',member.enabled?'有効':'無効'));
     const actions=create('div','workspace-member-actions');
     const edit=create('button','workspace-secondary-button','編集');edit.type='button';edit.addEventListener('click',()=>{row.replaceChildren(identity,meta,editRow(member));});
     const toggle=create('button','workspace-secondary-button',member.enabled?'無効にする':'有効にする');toggle.type='button';
     toggle.addEventListener('click',async()=>{if(!confirm(`${member.display_name||member.discord_id} を${member.enabled?'無効':'有効'}にしますか？`))return;toggle.disabled=true;try{await rpc('workspace_update_discord_member',{p_discord_id:member.discord_id,p_display_name:member.display_name,p_role:member.role,p_enabled:!member.enabled});status('メンバーの状態を更新しました。');await refresh();}catch(e){status('変更できませんでした：'+e.message);toggle.disabled=false;}});
     actions.append(edit,toggle);row.append(identity,meta,actions);list.append(row);
    }
   }catch(e){list.replaceChildren(create('p','workspace-status','メンバー一覧を取得できません：'+e.message));}
  }
  document.getElementById('member-create')?.addEventListener('submit',async event=>{
   event.preventDefault();const form=event.currentTarget,submit=form.querySelector('[type=submit]');const values=new FormData(form);submit.disabled=true;
   try{await rpc('workspace_add_discord_member',{p_discord_id:String(values.get('discordId')).trim(),p_display_name:String(values.get('displayName')).trim(),p_role:String(values.get('role'))});status('メンバーを登録しました。');form.reset();await refresh();}catch(e){status('登録できませんでした：'+e.message);}finally{submit.disabled=false;}
  });
  await refresh();
 }
 document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>{const el=document.getElementById('member-result');if(el)el.textContent='メンバー管理を開始できません：'+e.message;}));
})();

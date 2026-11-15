(() => {
 'use strict';
 const config=window.WORKSPACE_SUPABASE_CONFIG||{};
 const client=(config.url&&config.publishableKey&&window.supabase?.createClient)
  ? window.supabase.createClient(config.url,config.publishableKey):null;
 window.workspaceClient=client;
 const login=location.pathname.endsWith('/login.html');
 const status=document.getElementById('auth-status');
 const report=message=>{if(status)status.textContent=message};
 const roles={engineer:'エンジニア',admin:'管理者',staff:'スタッフ',talent:'タレント'};
 async function getAccess(){
  if(!client)return {error:'Supabase接続設定がありません。'};
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return {error:'ログインしてください。'};
  const {data:role,error:roleError}=await client.rpc('workspace_my_discord_role');
  if(roleError)return {error:'権限を取得できません：'+roleError.message};
  if(!roles[role])return {error:'Discordアカウントが未登録、または無効です。'};
  return {role,user};
 }
 window.workspaceAccess=getAccess;
 async function init(){
  if(!client){document.body.hidden=false;report('Supabase接続設定を確認してください。');return;}
  if(login){
   document.body.hidden=false;
   document.getElementById('discord-login')?.addEventListener('click',async()=>{
    report('Discordの認証画面へ移動します…');
    const redirectTo=new URL('login.html',location.href).href;
    const {error}=await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo,scopes:'identify'}});
    if(error)report('ログインを開始できません：'+error.message);
   });
   document.getElementById('logout')?.addEventListener('click',async()=>{
    await client.auth.signOut();report('ログアウトしました。');
    document.getElementById('enter-workspace').hidden=true;
   });
   const access=await getAccess();
   if(access.role){report('ログインを確認しました。許諾管理画面へ移動します…');location.replace(new URL('index.html',location.href).href);return;}
   else report(access.error);
   return;
  }
  const access=await getAccess();
  if(!access.role){location.replace('login.html');return;}
  const staff=['engineer','admin','staff'].includes(access.role);
  document.body.dataset.authRole=access.role;
  document.querySelectorAll('[data-staff-only]').forEach(el=>el.hidden=!staff);
  if(['pending.html','registry.html','discord.html','members.html'].some(n=>location.pathname.endsWith('/'+n))&&!staff){
   document.querySelector('main')?.replaceChildren(document.createTextNode('運営専用ページです。'));
   document.body.hidden=false;return;
  }
  document.body.hidden=false;
  if (document.body.dataset.page !== 'mypage') {
   const page=document.body.dataset.page;
   if(['pending','approved','registry'].includes(page)){
    const registryScript=document.createElement('script');registryScript.src='workspace-registry-cloud.js';
    registryScript.onload=()=>{const script=document.createElement('script');script.src=page==='registry'?'workspace-registry-admin.js':'workspace-game-cloud.js';document.body.appendChild(script);};
    document.body.appendChild(registryScript);
   }else{const script=document.createElement('script');script.src='game-pages.js';document.body.appendChild(script);}
  }
 }
 if(!login)document.body.hidden=true;
 init().catch(e=>{document.body.hidden=false;report('認証処理に失敗しました：'+e.message)});
})();

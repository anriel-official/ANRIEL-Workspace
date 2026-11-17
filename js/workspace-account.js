(() => {
  'use strict';
  const isTool = location.pathname.includes('/tools/game-permissions/');
  const base = isTool ? '' : 'tools/game-permissions/';
  const loginUrl = base + 'login.html';
  const mypageUrl = base + 'mypage.html';
  const getClient = () => {
    if (window.workspaceClient) return window.workspaceClient;
    const cfg = window.WORKSPACE_SUPABASE_CONFIG || {};
    if (!window.supabase?.createClient || !cfg.url || !cfg.publishableKey) return null;
    window.workspaceClient = window.supabase.createClient(cfg.url, cfg.publishableKey);
    return window.workspaceClient;
  };
  const nameOf = user => user.user_metadata?.full_name || user.user_metadata?.name || 'ログインユーザー';
  async function profile(client, user) {
    let name = nameOf(user);
    const identity = user.identities?.find(i => i.provider === 'discord');
    const discordId = String(identity?.identity_data?.provider_id || identity?.identity_data?.sub || user.user_metadata?.provider_id || '');
    // Membership is validated server-side by the existing role RPC; do not expose any keys here.
    let member = null;
    let result = await client.from('workspace_discord_members').select('display_name,discord_id').eq('auth_user_id',user.id).maybeSingle();
    if (!result.error) member = result.data;
    if (!member && discordId) {
      result = await client.from('workspace_discord_members').select('display_name,discord_id').eq('discord_id',discordId).maybeSingle();
      if (!result.error) member = result.data;
    }
    name = member?.display_name || name;
    const avatar = user.user_metadata?.avatar_url || identity?.identity_data?.avatar_url || '';
    return {name, discordId: member?.discord_id || discordId, avatar};
  }
  window.workspaceProfile = profile;
  async function init() {
    const header = document.querySelector('body > header');
    if (!header) return;
    const area = document.createElement('div'); area.className = 'workspace-account';
    const link = document.createElement('a'); link.href = mypageUrl; link.className = 'workspace-account-link';
    link.setAttribute('aria-label','マイページを開く');
    const avatar = document.createElement('img'); avatar.className = 'workspace-account-avatar'; avatar.alt = ''; avatar.hidden = true;
    const fallback = document.createElement('span'); fallback.className = 'workspace-avatar-fallback'; fallback.textContent = 'U';
    const name = document.createElement('span'); name.className = 'workspace-account-name'; name.textContent = 'マイページ';
    link.append(avatar,fallback,name);area.append(link);
    if (isTool) {
      const logout = document.createElement('button');
      logout.type = 'button';
      logout.className = 'workspace-header-logout';
      logout.textContent = 'ログアウト';
      logout.hidden = true;
      logout.addEventListener('click', async () => {
        const client = getClient();
        if (!client) return;
        logout.disabled = true;
        const {error} = await client.auth.signOut();
        if (error) { console.error('Logout failed:',error); logout.disabled = false; alert('ログアウトできませんでした。'); return; }
        location.replace(loginUrl);
      });
      area.append(logout);
    }
    header.append(area);
    const client = getClient(); if (!client) return;
    const {data:{user},error} = await client.auth.getUser();
    if (error || !user) { link.href = loginUrl; name.textContent = 'ログイン'; return; }
    if (isTool) area.querySelector('.workspace-header-logout').hidden = false;
    const p = await profile(client,user);
    name.textContent = p.name;
    if (p.avatar && /^https:\/\//.test(p.avatar)) {
      avatar.src = p.avatar;avatar.hidden=false;fallback.hidden=true;
      avatar.onerror=()=>{avatar.hidden=true;fallback.hidden=false};
    } else fallback.textContent = p.name.slice(0,1);
    const profileName = document.getElementById('workspace-profile-name');
    const profileId = document.getElementById('workspace-profile-discord-id');
    const profileAvatar = document.getElementById('workspace-profile-avatar');
    if(profileName)profileName.textContent=p.name;
    if(profileId)profileId.textContent=p.discordId ? 'Discord ID：'+p.discordId : 'Discord連携アカウント';
    if(profileAvatar && p.avatar && /^https:\/\//.test(p.avatar))profileAvatar.src=p.avatar;
  }
  document.addEventListener('DOMContentLoaded',()=>init().catch(e=>console.warn('Profile display:',e.message)));
})();

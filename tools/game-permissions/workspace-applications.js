(() => {
  'use strict';
  async function init() {
    const target = document.getElementById('profile-applications');
    if (!target) return;
    target.textContent = '申請履歴を取得しています…';
    const access = await window.workspaceAccess();
    if (!access.user || !access.role) {
      target.textContent = access.error || 'ログインしてください。';
      return;
    }
    const client = window.workspaceClient;
    const { data, error } = await client.from('workspace_game_applications')
      .select('id,title,store_url,official_url,stream_date,request_note,status,created_at')
      .eq('applicant_id', access.user.id).order('created_at', { ascending: false });
    if (error) { target.textContent = '申請履歴を取得できません：' + error.message; return; }
    target.replaceChildren();
    if (!data?.length) { target.textContent = 'まだ申請はありません。'; return; }
    for (const item of data) {
      const article = document.createElement('article');
      article.className = 'permission-entry workspace-compact-application';
      const heading = document.createElement('h3');
      heading.textContent = item.title || 'タイトル未入力';
      article.append(heading);
      const fields = [
        ['許諾状況', item.status || '未確認'],
        ...(item.stream_date ? [['配信予定日', item.stream_date]] : []),
        ...(item.request_note ? [['備考', item.request_note]] : [])
      ];
      for (const [name, value] of fields) {
        const p = document.createElement('p');
        p.textContent = `${name}：${value}`;p.className='workspace-compact-meta';
        article.append(p);
      }
      for (const [name, url] of [['ストア', item.store_url], ['公式サイト', item.official_url]]) {
        if (!url) continue;
        try {
          const parsed = new URL(url);
          if (!['https:', 'http:'].includes(parsed.protocol)) continue;
          const a = document.createElement('a');
          a.textContent = name + 'を開く';
          a.href = parsed.href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          article.append(a);
        } catch { /* 無効なURLは表示しない */ }
      }
      target.append(article);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(e => {
      const target = document.getElementById('profile-applications');
      if (target) target.textContent = '申請履歴を表示できません：' + e.message;
    });
  });
})();

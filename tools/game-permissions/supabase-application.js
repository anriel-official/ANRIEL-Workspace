(() => {
    'use strict';
    const config = window.WORKSPACE_SUPABASE_CONFIG || {};
    const form = document.getElementById('game-form');
    const status = document.getElementById('remote-submit-status');
    if (!form || !status) return;
    if (!config.url || !config.publishableKey) {
        status.textContent = 'Supabaseが未設定のため、申請を送信できません。';
        form.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
        return;
    }
    if (!window.supabase?.createClient) {
        status.textContent = 'Supabaseライブラリを読み込めませんでした。申請を送信できません。';
        form.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
        return;
    }
    const client = window.workspaceClient || window.supabase.createClient(config.url, config.publishableKey);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopImmediatePropagation(); // ローカル保存の二重実行を防止
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        status.textContent = '申請を送信しています…';
        try {
            const access = await window.workspaceAccess();
            if (!access.role) throw new Error(access.error || 'ログインしてください。');
            const payload = {
                title: document.getElementById('title').value,
                storeUrl: document.getElementById('store-url').value,
                officialUrl: document.getElementById('official-url').value,
                streamDate: document.getElementById('stream-date').value,
                requestNote: document.getElementById('request-note').value
            };
            const { data, error } = await client.functions.invoke('submit-game-permission', { body: payload });
            if (error) throw new Error(data?.error || error.message || '送信に失敗しました。');
            if (!data?.saved) throw new Error(data?.error || '申請を保存できませんでした。');
            status.textContent = data.notified ? '申請を保存し、Discordに通知しました。' : `申請は保存されました。${data.warning || '通知は未完了です。'}`;
            form.reset();
        } catch (error) {
            status.textContent = `申請に失敗しました：${error.message}`;
        } finally { button.disabled = false; }
    }, true);
})();

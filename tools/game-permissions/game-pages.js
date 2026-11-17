(() => {
    'use strict';
    const get = id => document.getElementById(id);
    const key = 'workspace-games-v1';
    const registryKey = 'workspace-game-registries-v1';
    const profileKey = 'workspace-demo-profile-v1';
    const favoriteKey = 'workspace-demo-favorites-v1';
    const page = document.body.dataset.page;
    const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
    const sorted = values => [...new Set(values.map(x => String(x || '').trim()).filter(Boolean))].sort(collator.compare);
    const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; } catch { return fallback; } };
    const profile = () => read(profileKey, { id: 'local-demo', name: '未設定（ローカル利用者）' });
    const role = () => document.body.dataset.authRole || 'talent';
    const staff = () => ['engineer', 'admin', 'staff'].includes(role()); // 運営は同等の操作権限
    let games = read(key, []).filter(g => g && typeof g.title === 'string');
    let registry = read(registryKey, { maker: [], category: [] });
    registry = { maker: sorted([...(registry.maker || []), ...games.map(g => g.maker)]), category: sorted([...(registry.category || []), ...games.map(g => g.category)]) };
    const save = () => { localStorage.setItem(key, JSON.stringify(games)); render(); };
    const saveRegistry = () => { localStorage.setItem(registryKey, JSON.stringify(registry)); renderRegistry(); suggestions(); };
    const el = (parent, tag, value) => { const n = document.createElement(tag); n.textContent = value; parent.appendChild(n); return n; };
    const button = (parent, label, callback) => { const b = el(parent, 'button', label); b.type = 'button'; b.addEventListener('click', callback); return b; };
    const favorites = () => read(favoriteKey, {})[profile().id] || [];
    const setFavorite = id => { const all = read(favoriteKey, {}); all[profile().id] = favorites().includes(id) ? favorites().filter(x => x !== id) : [...favorites(), id]; localStorage.setItem(favoriteKey, JSON.stringify(all)); render(); renderProfile(); };
    function suggestions() {
        for (const field of ['maker', 'category']) {
            const list = get(field + '-options'); if (!list) continue;
            list.replaceChildren();
            for (const value of registry[field]) { const option = document.createElement('option'); option.value = value; list.appendChild(option); }
        }
    }
    function links(parent, game) {
        for (const [name, field] of [['ゲームストア', 'store-url'], ['公式サイト', 'official-url'], ['参照URL', 'source-url']]) {
            if (!game[field]) continue;
            try { const u = new URL(game[field]); if (!['https:', 'http:'].includes(u.protocol)) continue;
                const a = el(parent, 'a', name + 'を開く'); a.href = u.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
            } catch { /* URL不正 */ }
        }
    }
    const makerScopeLabel = game => game.scopeType === 'series' ? (game.scopeName || '対象シリーズ未設定') : game.scopeType === 'partial' ? '一部タイトル' : '全タイトル';
    const makerDisplayName = game => `【${game.maker || 'メーカー未設定'}】${makerScopeLabel(game)}`;
    function updateScopeFields(prefix) {
        const type = get(prefix + '-entry-type')?.value;
        const isMaker = type === 'maker';
        document.querySelector(`.individual-title-field[data-prefix="${prefix}"]`)?.toggleAttribute('hidden', isMaker);
        document.querySelector(`.maker-scope-fields[data-prefix="${prefix}"]`)?.toggleAttribute('hidden', !isMaker);
        const custom = get(prefix + '-scope')?.value === 'series';
        document.querySelector(`.maker-custom-scope[data-prefix="${prefix}"]`)?.toggleAttribute('hidden', !custom);
        const preview = get(prefix + '-preview');
        if (preview) preview.textContent = `一覧表示：${makerDisplayName({ maker: get(prefix + '-maker')?.value.trim(), scopeType: get(prefix + '-scope')?.value, scopeName: get(prefix + '-scope-name')?.value.trim() })}`;
    }
    for (const prefix of ['review', 'direct']) {
        for (const suffix of ['entry-type', 'maker', 'scope', 'scope-name']) {
            get(prefix + '-' + suffix)?.addEventListener('input', () => updateScopeFields(prefix));
            get(prefix + '-' + suffix)?.addEventListener('change', () => updateScopeFields(prefix));
        }
        updateScopeFields(prefix);
    }
    const formatDate = value => { if (!value) return '記録なし'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString('ja-JP'); };
    const reviewFields = [
        ['category', 'カテゴリ', 'category'],
        ['maker', 'メーカー・権利元', 'text'],
        ['coverage-notes', '注意事項・配信条件', 'textarea'],
        ['required-text', '必須記載事項', 'textarea'],
        ['recommended-text', '推奨記載事項', 'textarea'],
        ['superchat', 'スパチャ・スパステ', ['未確認', 'OK', 'NG']],
        ['status', '許諾状況', ['未確認', '確認中', '申請中', '条件付き', '許諾済み', '事務所許可', '不可']],
        ['monetize', '収益化', ['未確認', '可能', '条件付き', '不可']],
        ['source', '許諾の根拠', ['未確認', '公式ガイドライン', '個別許諾']],
        ['source-url', '参照URL（任意）', 'url']
    ];
    function detailRow(parent, label, value) {
        const row = el(parent, 'div', ''); row.className = 'detail-row';
        el(row, 'dt', label); el(row, 'dd', value || '未登録');
    }
    function showApprovedDetails(game, panel) {
        if (!panel) return;
        panel.replaceChildren(); panel.hidden = false;
        el(panel, 'h2', game.entryType === 'maker' ? makerDisplayName(game) : game.title);
        const dl = el(panel, 'dl', ''); dl.className = 'game-detail-list';
        for (const [label, field] of [
            ['登録対象', 'entryType'], ['許諾対象範囲', 'scopeType'], ['メーカー・権利元', 'maker'], ['カテゴリ', 'category'],
            ['注意事項・配信条件', 'coverage-notes'],
            ['許諾状況', 'status'], ['必須記載事項', 'required-text'],
            ['推奨記載事項', 'recommended-text'], ['スパチャ・スパステ', 'superchat'],
            ['収益化', 'monetize'], ['許諾の根拠', 'source']
        ]) detailRow(dl, label, field === 'entryType' ? (game.entryType === 'maker' ? 'メーカー・権利元単位' : '個別ゲーム') : field === 'scopeType' ? (game.entryType === 'maker' ? makerScopeLabel(game) : '対象外') : game[field]);
        links(panel, game);
        const actions = el(panel, 'div', ''); actions.className = 'permission-actions';
        button(actions, favorites().includes(game.id) ? 'お気に入り解除' : 'お気に入り登録', () => {
            setFavorite(game.id); showApprovedDetails(game, panel);
        });
        if (staff()) button(actions, 'このゲームを編集', () => showApprovedEditor(game, panel));
        button(actions, '詳細を閉じる', () => { panel.hidden = true; panel.replaceChildren(); });
    }
    function showApprovedEditor(game, panel) {
        const old = get('approved-editor'); if (old) old.remove();
        const form = el(panel, 'form', ''); form.id = 'approved-editor'; form.className = 'permission-form';
        el(form, 'h3', '許諾情報の編集');
        if (game.entryType === 'maker') {
            const label = el(form, 'label', '許諾対象範囲'); label.htmlFor = 'edit-scope';
            const scope = el(form, 'select', ''); scope.id = 'edit-scope';
            for (const [value, name] of [['all','全タイトル'],['partial','一部タイトル'],['series','特定シリーズ・作品群']]) { const option = el(scope, 'option', name); option.value = value; }
            scope.value = game.scopeType || 'all';
            const customLabel = el(form, 'label', '対象シリーズ・作品群の名称'); customLabel.htmlFor = 'edit-scope-name';
            const custom = el(form, 'input', ''); custom.id = 'edit-scope-name'; custom.value = game.scopeName || '';
            const update = () => { custom.hidden = customLabel.hidden = scope.value !== 'series'; };
            scope.addEventListener('change', update); update();
        }
        for (const [field, label, type] of reviewFields) {
            const id = 'edit-' + field;
            const lbl = el(form, 'label', label); lbl.htmlFor = id;
            let control;
            if (Array.isArray(type)) {
                control = document.createElement('select');
                for (const value of type) { const option = document.createElement('option'); option.value = value; option.textContent = value; control.appendChild(option); }
            } else if (type === 'textarea') { control = document.createElement('textarea'); control.rows = 4; }
            else { control = document.createElement('input'); control.type = ['category', 'text'].includes(type) ? 'text' : 'url'; if (type === 'category') { control.setAttribute('list', 'edit-category-options'); } else control.placeholder = 'https://...'; }
            control.id = id; control.value = game[field] || (Array.isArray(type) ? '未確認' : ''); form.appendChild(control);
        }
        const categoryOptions = el(form, 'datalist', ''); categoryOptions.id = 'edit-category-options';
        for (const value of registry.category) { const opt = document.createElement('option'); opt.value = value; categoryOptions.appendChild(opt); }
        const info = el(form, 'section', ''); info.className = 'application-history';
        el(info, 'h4', '初回の申請情報（変更不可）');
        detailRow(info, '初回申請日', formatDate(game.createdAt));
        detailRow(info, '申請者', game.applicantName || '未設定');
        detailRow(info, '申請時の備考', game['request-note']);
        const actions = el(form, 'div', ''); actions.className = 'permission-actions';
        const saveButton = el(actions, 'button', '変更を保存'); saveButton.type = 'submit';
        button(actions, 'キャンセル', () => form.remove());
        form.addEventListener('submit', e => {
            e.preventDefault();
            if (!staff()) { alert('編集権限がありません。'); return; }
            for (const [field] of reviewFields) game[field] = get('edit-' + field).value.trim();
            if (game.entryType === 'maker') { game.scopeType = get('edit-scope').value; game.scopeName = get('edit-scope-name').value.trim(); game.title = makerDisplayName(game); }
            registry.category = sorted([...registry.category, game.category]); saveRegistry();
            game.updatedAt = new Date().toISOString();
            save(); alert('変更を保存しました。');
        });
        form.scrollIntoView({ behavior: 'smooth' });
    }
    function deleteGame(game) {
        if (!staff()) { alert('削除権限がありません。'); return; }
        const name = game.entryType === 'maker' ? makerDisplayName(game) : (game.title || 'タイトル未設定');
        if (!confirm(`「${name}」を削除しますか？\n削除したデータは元に戻せません。`)) return;
        games = games.filter(g => g.id !== game.id);
        const allFavorites = read(favoriteKey, {});
        for (const id of Object.keys(allFavorites)) {
            if (Array.isArray(allFavorites[id])) allFavorites[id] = allFavorites[id].filter(x => x !== game.id);
        }
        localStorage.setItem(favoriteKey, JSON.stringify(allFavorites));
        if (get('review-id')?.value === game.id) {
            get('review-form')?.reset();
            get('review-id').value = '';
        }
        save(); renderPending(); renderProfile();
    }
    function render() {
        const list = get('game-list'); const makerList = get('maker-game-list'); if (!list) return;
        list.replaceChildren(); if (makerList) makerList.replaceChildren();
        const q = (get('search')?.value || '').toLocaleLowerCase();
        const cat = get('category-filter')?.value || '';
        const onlyFavorites = get('favorites-only')?.checked;
        const visible = games.filter(g => ['許諾済み', '条件付き', '不可'].includes(g.status) &&
            (!cat || g.category === cat) &&
            `${g.title} ${g.maker || ''} ${g['coverage-notes'] || ''}`.toLocaleLowerCase().includes(q) &&
            (!onlyFavorites || favorites().includes(g.id)));
        if (!visible.length) el(list, 'p', '該当するゲームはありません。');
        if (makerList && !visible.some(g => g.entryType === 'maker')) el(makerList, 'p', '該当するメーカー単位の許諾はありません。');
        if (makerList && !visible.some(g => g.entryType !== 'maker')) el(list, 'p', '該当する個別ゲームはありません。');
        for (const g of visible) {
            const card = el(g.entryType === 'maker' && makerList ? makerList : list, 'article', ''); card.className = 'permission-entry';
            el(card, 'h3', g.entryType === 'maker' ? makerDisplayName(g) : g.title);
            el(card, 'p', g.entryType === 'maker' ? `メーカー包括許諾 / カテゴリ：${g.category || '未登録'}` : `メーカー・権利元：${g.maker || '未登録'} / カテゴリ：${g.category || '未登録'}`);
            if (g.entryType === 'maker' && g['coverage-notes']) el(card, 'p', g['coverage-notes']);
            el(card, 'p', `許諾状況：${g.status}`);
            const actions = el(card, 'div', ''); actions.className = 'permission-actions';
            const detail = el(card, 'section', ''); detail.className = 'approved-detail'; detail.hidden = true;
            button(actions, '詳細を見る', () => {
                const wasOpen = !detail.hidden;
                document.querySelectorAll('.permission-entry > .approved-detail').forEach(x => { x.hidden = true; x.replaceChildren(); });
                if (!wasOpen) showApprovedDetails(g, detail);
            });
            button(actions, favorites().includes(g.id) ? 'お気に入り解除' : 'お気に入り登録', () => setFavorite(g.id));
            if (staff()) { const remove = button(actions, '削除', () => deleteGame(g)); remove.classList.add('danger-button'); }
        }
    }
    function renderPending() {
        const list = get('pending-list'); if (!list) return;
        list.replaceChildren();
        const pendingGames = games.filter(g => !['条件付き', '許諾済み', '事務所許可', '不可'].includes(g.status));
        if (get('pending-count')) get('pending-count').textContent = `${pendingGames.length}件`;
        if (get('pending-tab-count')) get('pending-tab-count').textContent = String(pendingGames.length);
        if (!pendingGames.length) el(list, 'p', '対応中の申請・登録はありません。');
        for (const g of pendingGames) {
            const card = el(list, 'article', ''); card.className = 'permission-entry';
            el(card, 'h3', g.entryType === 'maker' ? `【${g.maker || 'メーカー未設定'}】全タイトル` : (g.title || 'タイトル未設定'));
            const summary = el(card, 'dl', ''); summary.className = 'pending-summary';
            for (const [label, value] of [['申請者', g.applicantName || '未設定'], ['備考', g['request-note'] || 'なし'], ['許諾状況', g.status || '未確認']]) {
                const row = el(summary, 'div', ''); row.className = 'pending-summary-row';
                el(row, 'dt', label); el(row, 'dd', value);
            }
            const actions = el(card, 'div', ''); actions.className = 'permission-actions';
            button(actions, '許諾情報を編集', () => {
                get('review-id').value = g.id;
                for (const [id, field] of [['review-entry-type','entryType'], ['review-title','title'], ['review-maker','maker'], ['review-store-url','store-url'], ['review-official-url','official-url'], ['review-applicant','applicantName'], ['review-category','category'], ['review-coverage-notes','coverage-notes'], ['review-stream-date','stream-date'], ['review-request-note','request-note'], ['required-text','required-text'], ['recommended-text','recommended-text'], ['superchat','superchat'], ['status','status'], ['monetize','monetize'], ['source','source'], ['source-url','source-url']]) {
                    if (get(id)) get(id).value = g[field] || (['superchat','status','monetize','source'].includes(id) ? '未確認' : '');
                }
                if (get('review-scope')) get('review-scope').value = g.scopeType || 'all';
                if (get('review-scope-name')) get('review-scope-name').value = g.scopeName || '';
                updateScopeFields('review');
                if (get('review-created-at')) get('review-created-at').value = formatDate(g.createdAt);
                get('review-form').scrollIntoView({ behavior: 'smooth' });
            });
            const remove = button(actions, '削除', () => deleteGame(g)); remove.classList.add('danger-button');
        }
    }
    function renderProfile() {
        const name = get('profile-name'); if (name && document.activeElement !== name) name.value = profile().name === '未設定（ローカル利用者）' ? '' : profile().name;
        for (const [id, records] of [['profile-favorites', games.filter(g => favorites().includes(g.id))], ['profile-applications', games.filter(g => g.applicantId === profile().id)]]) {
            const list = get(id); if (!list) continue; list.replaceChildren();
            if (!records.length) el(list, 'p', 'まだ登録がありません。');
            for (const g of records) { const card = el(list, 'article', ''); card.className = 'permission-entry'; el(card, 'h3', g.title); el(card, 'p', `許諾状況：${g.status || '未確認'}`); }
        }
    }
    function renderRegistry() {
        for (const field of ['maker', 'category']) {
            const list = get(field + '-registry-list'); if (!list) continue; list.replaceChildren();
            for (const value of registry[field]) {
                const li = el(list, 'li', ''); li.className = 'registry-item'; el(li, 'span', value);
                button(li, '編集', () => { const next = prompt('新しい名前', value)?.trim(); if (!next || (next !== value && registry[field].includes(next))) return;
                    registry[field] = sorted(registry[field].map(v => v === value ? next : v)); games = games.map(g => g[field] === value ? {...g, [field]: next} : g); saveRegistry(); save(); });
                button(li, '削除', () => { if (games.some(g => g[field] === value)) { alert('使用中の項目は削除できません。'); return; }
                    if (!confirm(`「${value}」を削除しますか？`)) return; registry[field] = registry[field].filter(v => v !== value); saveRegistry(); });
            }
        }
    }
    for (const field of ['maker', 'category']) {
        get(field + '-registry-form')?.addEventListener('submit', e => { e.preventDefault(); const input = get(field + '-registry-input'); const name = input.value.trim(); if (!name) return;
            registry[field] = sorted([...registry[field], name]); saveRegistry(); input.value = ''; });
    }
    get('game-form')?.addEventListener('submit', e => {
        e.preventDefault(); const p = profile();
        const record = { id: crypto.randomUUID(), title: get('title').value.trim(), maker: '', status: '未確認', monetize: '未確認', source: '未確認', superchat: '未確認', applicantId: p.id, applicantName: p.name, createdAt: new Date().toISOString() };
        for (const id of ['store-url','official-url','stream-date','request-note']) record[id] = get(id)?.value.trim() || '';
        if (get('raw')) record.raw = get('raw').value;
        games.unshift(record);
        save(); saveRegistry(); window.location.href = 'mypage.html';
    });
    get('direct-add-form')?.addEventListener('submit', e => {
        e.preventDefault();
        if (!staff()) { alert('運営のみ登録できます。'); return; }
        const value = id => get('direct-' + id).value.trim();
        const entryType = value('entry-type');
        const maker = value('maker');
        const title = value('title');
        if (entryType === 'maker' ? !maker : !title && !maker) {
            alert('ゲームタイトルかメーカー名を入力してください。'); return;
        }
        const p = profile();
        const record = {
            id: crypto.randomUUID(), entryType,
            title: entryType === 'maker' ? makerDisplayName({maker,scopeType:value('scope'),scopeName:value('scope-name')}) : (title || `【${maker}】タイトル未設定`),
            scopeType: entryType === 'maker' ? value('scope') : '', scopeName: entryType === 'maker' ? value('scope-name') : '',
            maker, category: value('category'),
            'store-url': value('store-url'), 'official-url': value('official-url'),
            'coverage-notes': value('coverage-notes'),
            'required-text': value('required-text'), 'recommended-text': value('recommended-text'),
            superchat: value('superchat'), status: value('status'), monetize: value('monetize'),
            source: value('source'), 'source-url': value('source-url'),
            applicantId: p.id, applicantName: `運営による直接登録（${p.name}）`,
            createdAt: new Date().toISOString(), registrationType: 'direct'
        };
        games.unshift(record);
        registry.maker = sorted([...registry.maker, maker]);
        registry.category = sorted([...registry.category, record.category]);
        saveRegistry(); save(); renderPending();
        get('direct-add-form').reset(); updateScopeFields('direct');
        alert(['条件付き', '許諾済み', '事務所許可', '不可'].includes(record.status)
            ? '登録しました。許諾済みゲーム一覧に表示されます。'
            : '登録しました。許諾中一覧に表示されます。');
    });
    get('reset-form')?.addEventListener('click', () => get('game-form').reset());
    get('review-form')?.addEventListener('submit', e => {
        e.preventDefault(); if (!staff()) return; const g = games.find(x => x.id === get('review-id').value);
        if (!g) { alert('先に一覧から編集対象を選んでください。'); return; }
        g.entryType = get('review-entry-type').value;
        g.title = get('review-title').value.trim();
        g.maker = get('review-maker').value.trim();
        g['store-url'] = get('review-store-url').value.trim();
        g['official-url'] = get('review-official-url').value.trim();
        g['coverage-notes'] = get('review-coverage-notes').value.trim();
        if (g.entryType === 'maker' && !g.maker) { alert('メーカー全タイトルを選ぶ場合はメーカー名が必要です。'); return; }
        if (g.entryType === 'game' && !g.title && !g.maker) { alert('ゲームタイトルまたはメーカー名を入力してください。'); return; }
        g.scopeType = g.entryType === 'maker' ? get('review-scope').value : '';
        g.scopeName = g.entryType === 'maker' ? get('review-scope-name').value.trim() : '';
        if (g.entryType === 'maker') g.title = makerDisplayName(g);
        registry.maker = sorted([...registry.maker, g.maker]);
        for (const field of ['category','required-text','recommended-text','superchat','status','monetize','source','source-url']) g[field] = get(field === 'category' ? 'review-category' : field).value.trim();
        registry.category = sorted([...registry.category, g.category]); saveRegistry();
        g.updatedAt = new Date().toISOString(); save(); renderPending(); if (['条件付き', '許諾済み', '事務所許可', '不可'].includes(g.status)) { get('review-form').reset(); get('review-id').value = ''; } alert(['条件付き', '許諾済み', '事務所許可', '不可'].includes(g.status) ? 'ゲーム一覧に移動しました。' : '許諾情報を保存しました。');
    });
    get('extract')?.addEventListener('click', () => {
        const raw = get('raw').value;
        const mapping = { title: ['ゲーム名','ゲームタイトル','タイトル'], maker: ['メーカー','権利元','メーカー・権利元'], 'store-url': ['ゲームストアURL','ストアURL'], 'official-url': ['ゲーム公式サイト','公式サイト'], 'stream-date': ['配信日'], 'request-note': ['備考'] };
        for (const [field, labels] of Object.entries(mapping)) {
            const line = raw.split(/\r?\n/).find(x => labels.some(label => x.trim().startsWith(label + '：') || x.trim().startsWith(label + ':')));
            if (line && get(field)) get(field).value = line.split(/[：:]/).slice(1).join(':').trim();
        }
        alert('抽出結果を確認してから登録してください。');
    });
    get('profile-form')?.addEventListener('submit', e => { e.preventDefault(); const name = get('profile-name').value.trim(); if (!name) return;
        const old = profile(); localStorage.setItem(profileKey, JSON.stringify({ id: old.id === 'local-demo' ? crypto.randomUUID() : old.id, name })); renderProfile(); alert('試用名を保存しました。'); });
    document.querySelectorAll('[data-staff-only]').forEach(x => { if (!staff()) x.hidden = true; });
    if (['pending','registry','discord'].includes(page) && !staff()) { document.querySelector('main').replaceChildren(); el(document.querySelector('main'), 'p', 'この画面は管理者・スタッフ向けです（試作版の表示制御）。'); return; }
    const makerCats = get('category-options');
    if (makerCats) for (const value of registry.category) { const opt = document.createElement('option'); opt.value = value; makerCats.appendChild(opt); }
    const cat = get('category-filter');
    if (cat) { for (const value of registry.category) { const opt = document.createElement('option'); opt.value = value; opt.textContent = value; cat.appendChild(opt); } cat.addEventListener('change', render); }
    get('favorites-only')?.addEventListener('change', render);
    get('search')?.addEventListener('input', render);
    if (page === 'pending') {
        const tabs = [get('tab-pending'), get('tab-add')];
        const panels = [get('pending-panel'), get('direct-add-section')];
        function switchTab(index) {
            tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
        }
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => switchTab(i));
            tab.addEventListener('keydown', e => {
                if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                switchTab(next); tabs[next].focus();
            });
        });
        switchTab(0);
    }
    suggestions(); render(); renderPending(); renderRegistry(); renderProfile();
})();

(() => {
    'use strict';

    const tools = window.WORKSPACE_TOOLS || [];
    const grid = document.getElementById('tools');

    function render() {
        grid.replaceChildren();

        const enabledTools = tools.filter(tool => tool.enabled);

        for (const tool of enabledTools) {
            const card = document.createElement('a');
            card.className = 'card';
            card.href = tool.url;

            const category = document.createElement('div');
            category.className = 'category';
            category.textContent = tool.category;

            const title = document.createElement('h3');
            title.textContent = tool.name;

            const description = document.createElement('p');
            description.textContent = tool.description;

            card.append(category, title, description);
            grid.append(card);
        }

        if (enabledTools.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'empty';
            empty.textContent = '登録されているツールはありません。';
            grid.append(empty);
        }
    }

    render();
})();

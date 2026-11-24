// Keep the native in-document loading stage white before the extension JS finishes loading.
(() => {
    if (document.getElementById('slk-early-splash-style')) return;
    // Match the saved '시작화면 / 헤더 이미지' choice even before slack.js loads.
    let mode = 'slack';
    try { mode = localStorage.getItem('slk-ui-header-image-mode') === 'custom' ? 'custom' : 'slack'; } catch { /* noop */ }
    const icon = mode === 'custom'
        ? new URL('img/logo.png', document.baseURI).href
        : new URL('./slack-splash-logo.png', import.meta.url).href;
    const el = document.createElement('style');
    el.id = 'slk-early-splash-style';
    el.textContent = `:root { --slk-loader-icon:url(${JSON.stringify(icon)}); }
    #preloader, #loader, #loader.splash-screen, dialog:has(#loader), dialog:has(#loader)::backdrop { background:#fff !important; }
    #loader { position:relative !important; }
    #loader > .splash-logo, #loader #load-spinner, #loader .splash-message, #loader::before { display:none !important; }
    #loader::after { content:"" !important; display:block !important; position:absolute !important; width:68px !important; height:68px !important; left:50% !important; top:46.5% !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; }
    #preloader::after { content:"" !important; display:block !important; position:absolute !important; width:68px !important; height:68px !important; left:50% !important; top:46.5% !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; }`;
    document.head.appendChild(el);
})();

// Slack UI for SillyTavern — 로더
// 브라우저(특히 iPhone)가 예전 파일을 붙잡고 있지 않도록, 매번 버전을 확인해 최신 파일을 불러옵니다.
(async () => {
    const base = new URL('./', import.meta.url);
    let v = String(Date.now());
    try {
        const r = await fetch(new URL('manifest.json', base), { cache: 'no-store' });
        v = (await r.json()).version || v;
    } catch { /* 오프라인 등 */ }
    // 스타일도 최신으로 (ST가 넣은 style.css 링크에 버전 붙이기)
    try {
        const cssPath = new URL('style.css', base).pathname;
        const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => {
            try { return new URL(l.href, location.href).pathname === cssPath; } catch { return false; }
        });
        const href = new URL('style.css', base); href.searchParams.set('v', v);
        if (link) { if (!link.href.includes('v=' + v)) link.href = href.href; }
        else { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href.href; document.head.appendChild(l); }
    } catch { /* noop */ }
    const js = new URL('slack.js', base); js.searchParams.set('v', v);
    await import(js.href);
})();

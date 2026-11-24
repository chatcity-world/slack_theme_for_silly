// Status bar bootstrap: entirely inside the extension, no server-file patch.
(() => {
    const key = '__slkStatusChrome';
    if (window[key]) return;
    const mq = matchMedia('(max-width: 1000px)');
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const allowed = () => {
        try { return localStorage.getItem('slk-ui-enabled') !== 'false' && mq.matches; }
        catch { return mq.matches; }
    };
    const original = new Map();
    const removed = new Map();
    let created = null;
    function set(color) {
        if (!allowed()) return;
        // Modern WebKit samples the page; avoid forcing a legacy status mode.
        if (apple) for (const meta of document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]')) {
            removed.set(meta, meta.nextSibling);
            meta.remove();
        }
        let metas = [...document.querySelectorAll('meta[name="theme-color"]')];
        if (!metas.length) {
            created = document.createElement('meta'); created.name = 'theme-color';
            document.head.append(created); metas = [created];
        }
        for (const meta of metas) {
            if (meta !== created && !original.has(meta)) original.set(meta, meta.getAttribute('content'));
            if (meta.content !== color) meta.content = color;
        }
    }
    function restore() {
        for (const [meta, value] of original) {
            if (value === null) meta.removeAttribute('content');
            else if (meta.content !== value) meta.content = value;
        }
        original.clear();
        created?.remove(); created = null;
        for (const [meta, next] of removed) document.head.insertBefore(meta, next?.parentNode === document.head ? next : null);
        removed.clear();
    }
    window[key] = {set, restore};
    if (allowed()) set('#FFFFFF');
    // Also undo the early metadata change if the mobile viewport is left.
    mq.addEventListener?.('change', () => { if (!allowed()) restore(); });
})();

// Keep the native in-document loading stage white before the extension JS finishes loading.
(() => {
    // The extension must not touch the native ST splash when Slack UI is off.
    try { if (localStorage.getItem('slk-ui-enabled') === 'false') return; } catch { /* use default */ }
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
    @layer slk-splash-chrome {
 @media screen and (max-width:1000px) {
    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)), :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) > body, html:has(dialog[open] #loader), html:has(dialog[open] #loader) > body { background:#fff!important; color-scheme:only light!important; }
    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader { position:fixed!important; inset:0!important; width:100%!important; height:100%!important; margin:0!important; background:#fff!important; color-scheme:only light!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }
    html:has(dialog[open] #loader) dialog[open]:has(#loader) { background:#fff!important; color-scheme:only light!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }
    html:has(dialog[open] #loader) dialog[open] #loader #load-spinner, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner, #slk-splash-chrome-sample {
      display:block!important; position:fixed!important; inset:0 0 auto 0!important;
      width:100%!important; min-width:0!important; max-width:none!important;
      height:max(12px,env(safe-area-inset-top,0px))!important; min-height:12px!important; max-height:none!important;
      margin:0!important; padding:0!important; border:0!important; border-radius:0!important;
      background:#fff!important; color:transparent!important; font-size:0!important;
      opacity:1!important; visibility:visible!important; box-shadow:none!important; text-shadow:none!important;
      transform:none!important; animation:none!important; transition:none!important; filter:none!important;
      backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
      overflow:hidden!important; pointer-events:none!important; z-index:2147483646!important;
    }
    html:has(dialog[open] #loader) #loader #load-spinner::before, html:has(dialog[open] #loader) #loader #load-spinner::after,
    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner::before, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner::after,
    html:has(dialog[open] #loader) #loader #load-spinner > *, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner > * {display:none!important;content:none!important;}
 }
 @media screen and (min-width:1001px) {#slk-splash-chrome-sample {display:none!important;}}
}
    #preloader, #loader, #loader.splash-screen, dialog:has(#loader), dialog:has(#loader)::backdrop { background:#fff !important; }
    #loader { position:relative !important; }
    #loader > .splash-logo, #loader #load-spinner, #loader .splash-message, #loader::before { display:none !important; }
    #loader::after { content:"" !important; display:block !important; position:fixed !important; width:74px !important; height:74px !important; left:50vw !important; top:46.5dvh !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; }
    #preloader::after { content:"" !important; display:block !important; position:fixed !important; width:74px !important; height:74px !important; left:50vw !important; top:46.5dvh !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; }`;
    document.head.appendChild(el);
})();


// Startup-only WebKit top-edge sample. No change to normal header geometry.
(() => {
    const mq = matchMedia('(max-width:1000px)');
    let surface, frame = 0;
    const enabled = () => {
        try { return mq.matches && localStorage.getItem('slk-ui-enabled') !== 'false'; }
        catch { return mq.matches; }
    };
    const visible = el => {
        if (!el || !el.isConnected) return false;
        const cs = getComputedStyle(el);
        return el.getClientRects().length > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
    };
    const sync = () => {
        frame = 0;
        const modal = [...document.querySelectorAll('dialog[open]')].find(el => el.querySelector('#loader') && visible(el));
        const preloader = document.getElementById('preloader');
        const parent = enabled() && (modal || (visible(preloader) ? preloader : null));
        if (parent) {
            if (!surface) {
                surface = document.createElement('div');
                surface.id = 'slk-splash-chrome-sample';
                surface.setAttribute('aria-hidden', 'true');
            }
            if (surface.parentNode !== parent) parent.appendChild(surface);
            window.__slkStatusChrome?.set('#FFFFFF');
        } else if (surface?.isConnected) {
            surface.remove();
            // Live header owns color again when the splash is gone.
            const color = document.documentElement.dataset.slkStatusColor;
            if (color && document.body?.classList.contains('slk-ui')) window.__slkStatusChrome?.set(color === 'purple' ? '#441848' : '#FFFFFF');
        }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const attach = () => {
        if (!document.body) return;
        const selector = '#preloader, dialog, #loader';
        const observer = new MutationObserver(records => {
            if (records.some(r => r.type === 'attributes' ? r.target.matches(selector) : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(selector) || n.querySelector(selector))))) schedule();
        });
        observer.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['style','class','hidden','open']});
        document.addEventListener('transitionend', e => { if (e.target.matches?.(selector)) schedule(); }, true);
        document.addEventListener('close', schedule, true);
        mq.addEventListener?.('change', schedule);
        window.addEventListener('pageshow', schedule);
        window.addEventListener('slk-ui-settings-changed', schedule);
        sync();
    };
    if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach, {once:true});
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
    // On a disabled boot, remove the entire Slack CSS (not only the slk-ui
    // body class). Many old selectors were global and could hide native icons.
    const disabled = (() => {
        try { return localStorage.getItem('slk-ui-enabled') === 'false'; }
        catch { return false; }
    })();
    // 스타일도 최신으로 (ST가 넣은 style.css 링크에 버전 붙이기)
    try {
        const cssPath = new URL('style.css', base).pathname;
        const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => {
            try { return new URL(l.href, location.href).pathname === cssPath; } catch { return false; }
        });
        const href = new URL('style.css', base); href.searchParams.set('v', v);
        if (link) {
            link.disabled = disabled;
            if (!disabled && !link.href.includes('v=' + v)) link.href = href.href;
        } else if (!disabled) {
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = href.href; document.head.appendChild(l);
        }
        if (disabled) {
            // Some ST versions insert more than one copy of an extension CSS.
            for (const sheet of document.querySelectorAll('link[rel="stylesheet"]')) {
                try { if (new URL(sheet.href, location.href).pathname === cssPath) sheet.disabled = true; }
                catch { /* noop */ }
            }
        }
    } catch { /* noop */ }
    const js = new URL('slack.js', base); js.searchParams.set('v', v);
    await import(js.href);
})();

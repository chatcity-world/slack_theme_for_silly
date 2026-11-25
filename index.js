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
    const firstIcon = mode === 'custom' ? icon : "data:image/webp;base64,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";
    const el = document.createElement('style');
    el.id = 'slk-early-splash-style';
    el.textContent = `:root { --slk-loader-icon:url(${JSON.stringify(icon)}); --slk-first-splash-icon:url(${JSON.stringify(firstIcon)}) !important; }
    @layer slk-splash-chrome {
 @media screen and (max-width:1000px) {
    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)), :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) > body, html:has(dialog[open] #loader), html:has(dialog[open] #loader) > body { background:#fff!important; color-scheme:only light!important; }
    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*="display: none"],[style*="display:none"],[style*="visibility: hidden"],[style*="visibility:hidden"],[style*="opacity: 0;"],[style*="opacity:0;"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader { position:fixed!important; inset:0!important; width:100%!important; height:100%!important; margin:0!important; background-color:#fff!important; color-scheme:only light!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }
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
  html body #preloader {
    background-image: var(--slk-first-splash-icon, var(--slk-loader-icon)) !important;
    background-repeat: no-repeat !important;
    background-size: 74px 74px !important;
    background-position: center calc(46.5dvh - 37px) !important;
    background-attachment: fixed !important;
  }
  html body #preloader::after { content: none !important; display: none !important; }
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
            if (!mq.matches && !surface?.isConnected) return;
            if (records.some(r => {
                if (r.target.closest?.('#chat .mes')) return false;
                if (r.type === 'attributes') return r.target.matches(selector);
                return [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && !n.matches('.mes') && (n.matches(selector) || n.querySelector(selector)));
            })) schedule();
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

// Slack UI for SillyTavern — v0.9.2 (mobile light: header + bottom tab bar)

// Settings are kept independently of SillyTavern's extension loader state.
const SLK_UI_SETTINGS = (() => {
    const read = (key, fallback) => {
        try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    };
    return {
        enabled: read('slk-ui-enabled', 'true') !== 'false',
        theme: read('slk-ui-theme', 'light') === 'dark' ? 'dark' : 'light',
    };
})();

function applySlackUiSettings() {
    document.body.classList.toggle('slk-ui', SLK_UI_SETTINGS.enabled);
    document.body.classList.toggle('slk-dark', SLK_UI_SETTINGS.enabled && SLK_UI_SETTINGS.theme === 'dark');
    if (!SLK_UI_SETTINGS.enabled) {
        document.body.classList.remove('slk-footer-only-active');
        document.body.classList.remove('slk-managed-navigation', 'slk-no-panel');
        document.querySelectorAll('.slk-nav-hidden').forEach(el => el.classList.remove('slk-nav-hidden'));
        document.getElementById('slk-settings-menu')?.setAttribute('hidden', '');
        const footer = document.getElementById('slk-mobile-footer');
        if (footer) footer.style.setProperty('display', 'none', 'important');
    }
    window.dispatchEvent(new Event('slk-ui-settings-changed'));
}

// Use the same collapsible markup as SillyTavern's built-in extension settings.
// This is a settings entry, not a new bottom tab.
function buildSlackUiExtensionSettings() {
    const list = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!list) return;
    if (document.getElementById('slk-extension-settings')) return;

    const container = document.createElement('div');
    container.id = 'slk-extension-settings';
    container.className = 'extension_container';
    container.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header" role="button" tabindex="0" aria-expanded="false" aria-controls="slk-extension-settings-content">
                <b>Slack UI</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down" aria-hidden="true"></div>
            </div>
            <div id="slk-extension-settings-content" class="inline-drawer-content" style="display:none">
                <div class="slk-settings-row">
                    <label for="slk-enable-toggle">사용</label>
                    <label class="slk-setting-switch">
                        <input type="checkbox" id="slk-enable-toggle" role="switch" aria-label="Slack UI 사용">
                        <span class="slk-setting-switch-track" aria-hidden="true"></span>
                    </label>
                </div>
                <div class="slk-settings-row">
                    <span id="slk-theme-label">테마</span>
                    <div class="slk-theme-segment" role="radiogroup" aria-labelledby="slk-theme-label">
                        <label><input type="radio" name="slk-theme" value="light"><span>라이트</span></label>
                        <label><input type="radio" name="slk-theme" value="dark"><span>블랙</span></label>
                    </div>
                </div>
            </div>
        </div>`;
    list.appendChild(container);

    const header = container.querySelector('.inline-drawer-toggle');
    const content = container.querySelector('.inline-drawer-content');
    const icon = container.querySelector('.inline-drawer-icon');
    const toggle = () => {
        const open = header.getAttribute('aria-expanded') !== 'true';
        header.setAttribute('aria-expanded', String(open));
        content.style.display = open ? 'block' : 'none';
        icon.classList.toggle('down', !open);
        icon.classList.toggle('up', open);
    };
    // The event is owned here to avoid depending on whether SillyTavern binds
    // its native inline drawer handler before or after third-party extensions.
    header.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
    });
    header.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        toggle();
    });

    const enabledInput = container.querySelector('#slk-enable-toggle');
    enabledInput.checked = SLK_UI_SETTINGS.enabled;
    enabledInput.addEventListener('change', () => {
        SLK_UI_SETTINGS.enabled = enabledInput.checked;
        try { localStorage.setItem('slk-ui-enabled', String(SLK_UI_SETTINGS.enabled)); } catch { /* localStorage unavailable */ }
        applySlackUiSettings();
    });

    const themeInputs = container.querySelectorAll('input[name="slk-theme"]');
    themeInputs.forEach(input => {
        input.checked = input.value === SLK_UI_SETTINGS.theme;
        input.addEventListener('change', () => {
            if (!input.checked) return;
            SLK_UI_SETTINGS.theme = input.value;
            try { localStorage.setItem('slk-ui-theme', SLK_UI_SETTINGS.theme); } catch { /* localStorage unavailable */ }
            applySlackUiSettings();
        });
    });
}

const SLK = {
    header: null,
    menu: null,
};

// 원래 상단 탭바의 드로어 ID
const DRAWERS = {
    userSettings: '#user-settings-button',
    backgrounds: '#backgrounds-button',
    character: '#rightNavHolder',
};

// Slack 스타일 라인 아이콘 (24px, stroke)
const svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
    // 프롬프트: 터미널 프롬프트 >_
    prompt: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7.5 10 2.5 2-2.5 2"/><path d="M12.5 15h4"/>'),
    // 연결: 플러그
    connection: svg('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v4a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z"/>'),
    // 고급서식: Aa
    formatting: svg('<path d="m3 18 4.5-12L12 18"/><path d="M4.7 13.5h5.6"/><circle cx="17.5" cy="15" r="3"/><path d="M20.5 12v6"/>'),
    // 로어북: 펼친 책
    lorebook: svg('<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>'),
    // 확장: 퍼즐
    extensions: svg('<path d="M10 3.5a2 2 0 1 1 4 0V5h3a2 2 0 0 1 2 2v3h-1.5a2 2 0 1 0 0 4H19v3a2 2 0 0 1-2 2h-3v-1.5a2 2 0 1 0-4 0V19H7a2 2 0 0 1-2-2v-3h1.5a2 2 0 1 0 0-4H5V7a2 2 0 0 1 2-2h3z"/>'),
    // 페르소나: 나 (원 안의 사람)
    persona: svg('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5a6.5 6.5 0 0 1 11 0"/>'),
    // 캐릭터: 여러 사람
    character: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1"/><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20v-1a5 5 0 0 0-3.5-4.8"/>'),
    // 설정 메뉴
    userSettings: svg('<path d="M4 6h9"/><path d="M17 6h3"/><circle cx="15" cy="6" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 18h11"/><path d="M19 18h1"/><circle cx="17" cy="18" r="2"/>'),
    backgrounds: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20.5"/>'),
};

// 바텀 탭 = 원래 드로어 ID → 아이콘
const TABS = [
    ['#ai-config-button', 'prompt', '프롬프트'],
    ['#sys-settings-button', 'connection', '연결'],
    ['#advanced-formatting-button', 'formatting', '고급 서식'],
    ['#WI-SP-button', 'lorebook', '로어북'],
    ['#extensions-settings-button', 'extensions', '확장'],
    ['#persona-management-button', 'persona', '페르소나'],
    ['#rightNavHolder', 'character', '캐릭터'],
];

function buildTabIcons() {
    TABS.forEach(([sel, key, label]) => {
        const toggle = document.querySelector(`${sel} > .drawer-toggle`);
        if (!toggle || toggle.querySelector('.slk-tab-icon')) return;
        const span = document.createElement('span');
        span.className = 'slk-tab-icon';
        span.innerHTML = ICONS[key];
        toggle.appendChild(span);
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
    });
}

// 패널을 누른 바로 그 순간 헤더를 먼저 준비합니다.
// ST가 drawer-icon.openIcon을 나중에 붙일 때 생기는 한 프레임의 깜빡임 방지.
let slkHeaderOpeningObserver = null;
let slkHeaderOpeningTimeout = null;
let slkHeaderOpeningSequence = 0;

function primePanelHeader(selector) {
    if (!window.matchMedia('(max-width: 1000px)').matches) return;
    const drawer = document.querySelector(selector);
    if (!drawer || drawer.querySelector('.drawer-icon.openIcon, .drawer-content.openDrawer') || drawer.classList.contains('openDrawer')) return;

    if (slkHeaderOpeningObserver) slkHeaderOpeningObserver.disconnect();
    clearTimeout(slkHeaderOpeningTimeout);
    const sequence = ++slkHeaderOpeningSequence;
    document.body.classList.add('slk-panel-opening');
    document.body.classList.remove('slk-header-compact');

    const finish = () => {
        if (sequence !== slkHeaderOpeningSequence) return;
        slkHeaderOpeningObserver?.disconnect();
        slkHeaderOpeningObserver = null;
        clearTimeout(slkHeaderOpeningTimeout);
        document.body.classList.remove('slk-panel-opening');
    };
    slkHeaderOpeningObserver = new MutationObserver(() => {
        if (drawer.querySelector('.drawer-icon.openIcon') &&
            (drawer.querySelector('.drawer-content.openDrawer') || drawer.classList.contains('openDrawer'))) {
            // 실제 패널 헤더가 준비된 다음 프레임에만 임시 상태 해제
            requestAnimationFrame(finish);
        }
    });
    slkHeaderOpeningObserver.observe(drawer, { subtree: true, attributes: true, attributeFilter: ['class'] });
    slkHeaderOpeningTimeout = setTimeout(finish, 1800); // 패널 실행 실패 시 정리
}

function openDrawer(selector) {
    const toggle = document.querySelector(`${selector} .drawer-toggle`);
    if (!toggle) return;
    primePanelHeader(selector);
    // ST는 jQuery로 클릭 핸들러를 걸기 때문에 jQuery가 있으면 그걸로 트리거
    if (window.jQuery) window.jQuery(toggle).trigger('click');
    else toggle.click();
}

// Route extension/header navigation through the same mobile page history as the footer.
// Desktop and disabled Slack UI keep SillyTavern's original drawer behavior.
function navigateSlackPanel(selector) {
    if (SLK_UI_SETTINGS.enabled && window.matchMedia('(max-width: 1000px)').matches && window.__slkPanelNavigation) {
        window.__slkPanelNavigation.navigate(selector);
    } else {
        openDrawer(selector);
    }
}

function buildHeader() {
    if (document.getElementById('slk-header')) return;

    const header = document.createElement('div');
    header.id = 'slk-header';
    header.innerHTML = `
        <button id="slk-ws" type="button" title="캐릭터 목록">
            <span class="slk-ws-avatar has-img"><img src="img/logo.png" alt="" onerror="this.parentElement.classList.remove('has-img')" /><span class="slk-ws-initial">S</span></span>
            <span class="slk-ws-text">
                <span class="slk-ws-name">Slack</span>
                <span class="slk-ws-ver"></span>
                <span class="slk-ws-branch" hidden></span>
            </span>
        </button>
        <div class="slk-header-actions">
            <button id="slk-settings-btn" type="button" title="설정">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
        </div>
    `;

    const menu = document.createElement('div');
    menu.id = 'slk-settings-menu';
    menu.hidden = true;
    menu.innerHTML = `
        <button type="button" class="slk-menu-item" data-target="userSettings">
            <span class="slk-menu-icon">${ICONS.userSettings}</span><span>사용자 설정</span>
        </button>
        <button type="button" class="slk-menu-item" data-target="backgrounds">
            <span class="slk-menu-icon">${ICONS.backgrounds}</span><span>배경</span>
        </button>
    `;

    document.body.appendChild(header);
    document.body.appendChild(menu);
    // SillyTavern auto-closes drawers on html mousedown/touchstart.
    // Keep header navigation inside the Slack-managed layer flow.
    for (const type of ['touchstart', 'mousedown']) {
        header.addEventListener(type, (event) => event.stopPropagation());
        menu.addEventListener(type, (event) => event.stopPropagation());
    }
    SLK.header = header;
    SLK.menu = menu;

    header.querySelector('#slk-ws').addEventListener('click', () => {
        closeMenu();
        navigateSlackPanel(DRAWERS.character);
    });

    header.querySelector('#slk-settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
    });

    menu.querySelectorAll('.slk-menu-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            navigateSlackPanel(DRAWERS[btn.dataset.target]);
        });
    });

    document.addEventListener('click', (e) => {
        if (!menu.hidden && !menu.contains(e.target)) closeMenu();
    });
}

function openMenu() {
    SLK.menu.hidden = false;
    SLK.header.querySelector('#slk-settings-btn').classList.add('slk-active');
}

function closeMenu() {
    if (!SLK.menu) return;
    SLK.menu.hidden = true;
    SLK.header.querySelector('#slk-settings-btn').classList.remove('slk-active');
}

// 헤더 왼쪽 = SillyTavern + 버전 + 브랜치(release/staging)
async function fetchVersion() {
    try {
        const res = await fetch('/version', { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json(); // { pkgVersion, gitBranch, gitRevision, agent }
    } catch {
        return null;
    }
}

async function updateHeader() {
    if (!SLK.header) return;
    const v = await fetchVersion();
    const ver = SLK.header.querySelector('.slk-ws-ver');
    const branch = SLK.header.querySelector('.slk-ws-branch');

    ver.textContent = v?.pkgVersion ? v.pkgVersion : '';
    if (v?.gitBranch) {
        branch.textContent = v.gitBranch;
        branch.hidden = false;
    } else {
        branch.hidden = true;
    }
    if (v?.gitRevision) SLK.header.querySelector('#slk-ws').title = `SillyTavern ${v.pkgVersion} '${v.gitBranch}' (${v.gitRevision})`;
}


// ===================================================
// 프롬프트(AI 응답 설정) 패널 — 비슷한 항목끼리 탭으로 묶기
// ST 요소는 옮기지 않고 data-slk-tab 표시만 붙여서 CSS로 탭 전환
// ===================================================
const AI_TABS = [
    ['basic', '기본', svg('<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>')],
    ['sampling', '샘플링', svg('<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><path d="M12 14v3"/>')],
    ['prompts', '프롬프트', svg('<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>')],
    ['advanced', '고급', svg('<path d="M12 3v3"/><path d="M12 18v3"/><path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m4.9 19.1 2.1-2.1"/><path d="m17 7 2.1-2.1"/><circle cx="12" cy="12" r="3.5"/>')],
];

// '기본' 탭에 들어갈 항목 (컨텍스트, 응답 길이, 스와이프, 스트리밍 등)
const AI_BASIC_IDS = [
    '#oai_max_context_unlocked', '#openai_max_context', '#openai_max_tokens', '#n_openai',
    '#openrouter_middleout', '#openrouter_max_prompt_cost', '#electronhub_max_prompt_cost',
    '#chutes_max_prompt_cost', '#stream_toggle',
].join(',');

// 텍스트 완성 등 다른 API용 블록
const AI_OTHER_BLOCKS = {
    '#common-gen-settings-block': 'basic',
    '#range_block': 'sampling',
    '#range_block_novel': 'sampling',
    '#kobold_api-settings': 'advanced',
    '#novel_api-settings': 'advanced',
    '#textgenerationwebui_api-settings': 'advanced',
};

function tagAiBlocks() {
    const rbo = document.getElementById('range_block_openai');
    if (rbo) {
        [...rbo.children].forEach((el) => {
            let tab = 'sampling';
            if (el.classList.contains('inline-drawer')) tab = 'prompts'; // 빠른 프롬프트 편집, 유틸리티 프롬프트
            else if (el.matches(AI_BASIC_IDS) || el.querySelector(AI_BASIC_IDS)) tab = 'basic';
            el.dataset.slkTab = tab;
        });
    }

    const os = document.getElementById('openai_settings');
    if (os) {
        [...os.children].forEach((el) => {
            el.dataset.slkTab = el.querySelector('#completion_prompt_manager') ? 'prompts' : 'advanced';
        });
    }

    Object.entries(AI_OTHER_BLOCKS).forEach(([sel, tab]) => {
        const el = document.querySelector(sel);
        if (el) el.dataset.slkTab = tab;
    });
}

function setAiTab(key) {
    const panel = document.getElementById('left-nav-panel');
    if (!panel) return;
    panel.dataset.slkActiveTab = key;
    panel.querySelectorAll('.slk-aitab').forEach((b) => b.classList.toggle('active', b.dataset.tab === key));
    try { localStorage.setItem('slk-ai-tab', key); } catch { /* 저장 실패는 무시 */ }
}

function buildAiTabs() {
    const presets = document.getElementById('respective-presets-block');
    if (!presets || document.getElementById('slk-aitabs')) return;

    const bar = document.createElement('div');
    bar.id = 'slk-aitabs';
    bar.setAttribute('role', 'tablist');
    bar.innerHTML = AI_TABS.map(([key, label, icon]) =>
        `<button type="button" class="slk-aitab" role="tab" data-tab="${key}">${icon}<span>${label}</span></button>`).join('');
    presets.insertAdjacentElement('afterend', bar);

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.slk-aitab');
        if (!btn) return;
        setAiTab(btn.dataset.tab);
        const scroller = bar.closest('.scrollableInner');
        if (scroller && scroller.scrollTop > bar.offsetTop) scroller.scrollTop = bar.offsetTop;
    });

    tagAiBlocks();
    let saved = 'basic';
    try { saved = localStorage.getItem('slk-ai-tab') || 'basic'; } catch { /* 기본값 사용 */ }
    setAiTab(AI_TABS.some(([k]) => k === saved) ? saved : 'basic');
}

// iOS 입력창 자동 확대 방지 (CSS 16px 규칙과 함께) — 핀치 확대는 iOS가 계속 허용함
function preventInputZoom() {
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const content = meta.getAttribute('content') || '';
    if (!/maximum-scale/.test(content)) meta.setAttribute('content', `${content}, maximum-scale=1`);
}


// ===================================================
// 로어북 항목: 이동·복제·삭제를 ⋯(더 보기) 메뉴로 모으기
// ST가 항목을 다시 그릴 때마다 ⋯ 버튼을 붙이고, 메뉴에서 원래 버튼을 대신 눌러줌
// ===================================================
const WI_MORE_ICON = svg('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>');
const WI_MENU_ITEMS = [
    ['.move_entry_button', '다른 로어북으로 이동·복사', svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>')],
    ['.duplicate_entry_button', '항목 복제', svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>')],
    ['.delete_entry_button', '항목 삭제', svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'), 'danger'],
];
let wiMenu = null;
let wiMenuTarget = null;

function closeWiMenu() {
    if (wiMenu) wiMenu.hidden = true;
    wiMenuTarget = null;
}

function buildWiMenu() {
    if (wiMenu) return;
    wiMenu = document.createElement('div');
    wiMenu.id = 'slk-wi-menu';
    wiMenu.hidden = true;
    wiMenu.innerHTML = WI_MENU_ITEMS.map(([sel, label, icon, kind]) =>
        `<button type="button" class="slk-menu-item ${kind || ''}" data-sel="${sel}"><span class="slk-menu-icon">${icon}</span><span>${label}</span></button>`).join('');
    document.body.appendChild(wiMenu);
    wiMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.slk-menu-item');
        if (!item || !wiMenuTarget) return;
        e.stopPropagation();
        const btn = wiMenuTarget.querySelector(`.inline-drawer-header > ${item.dataset.sel}`);
        closeWiMenu();
        if (!btn) return;
        if (window.jQuery) window.jQuery(btn).trigger('click');
        else btn.click();
    });
    document.addEventListener('click', (e) => {
        if (!wiMenu.hidden && !wiMenu.contains(e.target) && !e.target.closest('.slk-wi-more')) closeWiMenu();
    });
    document.getElementById('WorldInfo')?.addEventListener('scroll', closeWiMenu, true);
}

function openWiMenu(button) {
    buildWiMenu();
    wiMenuTarget = button.closest('.world_entry');
    wiMenu.hidden = false;
    const r = button.getBoundingClientRect();
    const w = wiMenu.offsetWidth;
    const h = wiMenu.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 90) top = r.top - h - 6;
    wiMenu.style.top = `${Math.max(8, top)}px`;
    wiMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
}

function addWiMoreButtons(root = document) {
    root.querySelectorAll('#world_popup_entries_list .world_entry .WIEnteryHeaderControls').forEach((controls) => {
        if (controls.querySelector('.slk-wi-more')) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'slk-wi-more';
        b.title = '더 보기';
        b.innerHTML = WI_MORE_ICON;
        b.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (wiMenu && !wiMenu.hidden && wiMenuTarget === b.closest('.world_entry')) closeWiMenu();
            else openWiMenu(b);
        });
        controls.appendChild(b);
    });
}

// 키워드 입력칸: 내용 줄 수만큼 자동으로 늘어남
const WI_GROW_SELECTOR = '#world_popup_entries_list textarea.keyprimarytextpole, #world_popup_entries_list textarea.keysecondarytextpole';

function growTextarea(t) {
    if (!t.offsetParent) return; // 접혀 있으면 높이 계산 불가 → 펼칠 때 다시
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
}

function setupWiKeywordInputs() {
    document.querySelectorAll(WI_GROW_SELECTOR).forEach((t) => {
        if (!t.dataset.slkGrow) {
            t.dataset.slkGrow = '1';
            t.addEventListener('input', () => growTextarea(t));
            t.addEventListener('focus', () => growTextarea(t));
        }
        growTextarea(t);
    });
    // 입력 방식 전환 버튼: 지금 아이콘(✨/⌨️)을 data 속성으로 → CSS가 선 아이콘으로 그림
    document.querySelectorAll('#world_popup_entries_list .switch_input_type_icon').forEach((b) => {
        const mode = (b.textContent || '').includes('✨') ? 'sparkle' : 'keyboard';
        if (b.dataset.slkIcon !== mode) b.dataset.slkIcon = mode;
    });
}

function watchWorldInfo() {
    const list = document.getElementById('world_popup_entries_list');
    if (!list) return;
    const run = () => {
        addWiMoreButtons();
        setupWiKeywordInputs();
    };
    run();
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            run();
        });
    }).observe(list, { childList: true, subtree: true, characterData: true });
}


// ===================================================
// 페르소나: 목록에서 고른 페르소나 바로 밑에 편집 영역(Current Persona)을 펼침
// ST가 목록을 다시 그릴 때 목록을 비우므로(.empty) 편집 영역을 목록 안으로 옮기지 않고,
// 선택한 줄 밑에 빈 자리(slot)를 만들고 편집 영역을 그 위치에 겹쳐 놓는 방식
// ===================================================
function setupPersonaAccordion() {
    const panel = document.getElementById('PersonaManagement');
    const block = document.getElementById('persona-management-block');
    const list = document.getElementById('user_avatar_block');
    const editor = panel?.querySelector('.persona_management_current_persona');
    if (!panel || !block || !list || !editor || panel.dataset.slkAccordion) return;
    panel.dataset.slkAccordion = '1';

    const mq = window.matchMedia('(max-width: 1000px)');
    const slot = document.createElement('div');
    slot.className = 'slk-persona-slot';
    let collapsed = false;
    let queued = false;

    const place = () => {
        queued = false;
        if (!mq.matches) {
            slot.remove();
            editor.classList.remove('slk-floating', 'slk-hidden');
            editor.style.top = '';
            list.querySelectorAll('.slk-open').forEach((a) => a.classList.remove('slk-open'));
            return;
        }
        // SillyTavern switches the persona list into grid mode by adding .gridView.
        // Grid mode must use the native document flow: the editor belongs below
        // the entire list, not in a slot after the selected avatar.
        if (list.classList.contains('gridView')) {
            collapsed = false;
            slot.remove();
            list.querySelectorAll('.slk-open').forEach((a) => a.classList.remove('slk-open'));
            editor.classList.remove('slk-floating', 'slk-hidden');
            editor.style.top = '';
            return;
        }
        const sel = list.querySelector('.avatar-container.selected');
        list.querySelectorAll('.avatar-container').forEach((a) => a.classList.toggle('slk-open', a === sel && !collapsed));
        if (!sel || collapsed) {
            slot.remove();
            editor.classList.add('slk-floating', 'slk-hidden');
            return;
        }
        if (sel.nextElementSibling !== slot) sel.after(slot);
        editor.classList.add('slk-floating');
        editor.classList.remove('slk-hidden');
        const h = editor.offsetHeight;
        if (slot.style.height !== `${h}px`) slot.style.height = `${h}px`;
        const top = slot.getBoundingClientRect().top - block.getBoundingClientRect().top;
        editor.style.top = `${Math.round(top)}px`;
    };
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(place);
    };

    // 이미 선택된 줄을 다시 누르면 접기/펼치기
    list.addEventListener('click', (e) => {
        const item = e.target.closest('.avatar-container');
        if (!item) return;
        // In grid mode, clicking a persona only changes the selection.
        // Keep accordion toggling exclusively in the one-row list mode.
        if (list.classList.contains('gridView')) return;
        collapsed = item.classList.contains('selected') ? !collapsed : false;
        schedule();
    }, true);

    new MutationObserver(schedule).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(schedule).observe(editor);
    new ResizeObserver(schedule).observe(list);
    window.addEventListener('resize', schedule);
    mq.addEventListener?.('change', schedule);
    schedule();
}

function relabelPersonaButtons() {
    const el = document.querySelector('#lock_persona_to_char > div');
    if (el && el.textContent.trim() !== '캐릭터') {
        el.removeAttribute('data-i18n');
        el.textContent = '캐릭터';
    }
}

// ===================================================
// 캐릭터 패널: 지금 보이는 화면(목록 / 편집 / 그룹)을 패널에 표시
// ST는 화면을 바꿀 때 .right_menu 블록의 style.display만 바꾸므로 그걸 지켜봄
// ===================================================
const CHAR_VIEWS = [
    ['rm_characters_block', 'list'],
    ['rm_ch_create_block', 'edit'],
    ['rm_group_chats_block', 'group'],
];

function syncCharView() {
    const panel = document.getElementById('right-nav-panel');
    if (!panel) return;
    let view = 'other';
    for (const [id, name] of CHAR_VIEWS) {
        const el = document.getElementById(id);
        if (el && getComputedStyle(el).display !== 'none') {
            view = name;
            break;
        }
    }
    if (panel.dataset.slkView !== view) panel.dataset.slkView = view;
}

function watchCharView() {
    const panel = document.getElementById('right-nav-panel');
    if (!panel) return;
    syncCharView();
    const obs = new MutationObserver(syncCharView);
    panel.querySelectorAll('.right_menu').forEach(el => obs.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }));
    obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
}

// ===================================================
// 입력창: 슬랙처럼 누르면 펼쳐지고(입력칸 위 / 도구 줄 아래), 비우고 나가면 접힘
// 버튼을 눌러도 입력칸 포커스가 빠지지 않게 해서, 접히면서 버튼이 밀려 안 눌리는 일을 막음
// ===================================================
function setupComposer() {
    const form = document.getElementById('send_form');
    const ta = document.getElementById('send_textarea');
    if (!form || !ta || form.dataset.slkComposer) return;
    form.dataset.slkComposer = '1';

    // v1.4.20: 키보드가 닫혀도 iOS는 textarea 포커스를 계속 유지할 수 있습니다.
    // 입력 내용/생성 상태는 배치 결정에 사용하지 않고, 뷰포트 높이의
    // 감소(키보드 열림) 및 증가(키보드 닫힘)를 추적합니다.
    const viewport = window.visualViewport;
    const measure = () => {
        const layout = window.innerHeight || document.documentElement.clientHeight;
        const visual = viewport?.height;
        return Number.isFinite(visual) && visual > 0 ? visual : layout;
    };
    let lastHeight = measure();
    let maximumHeight = lastHeight;
    let keyboardVisible = false;
    let keyboardDismissed = false;
    let pendingFocus = false;

    // v1.4.21: 접힌 입력창에서 native textarea의 마지막 줄/스크롤 위치가
    // 표시되지 않도록, 실제 값은 그대로 두고 첫 줄만 표시하는 읽기 전용 미리보기.
    // 줄바꿈이 있거나 첫 줄이 긴 경우 말줄임표(…)를 표시합니다.
    const preview = document.createElement('span');
    preview.className = 'slk-compose-first-line';
    preview.setAttribute('aria-hidden', 'true');
    ta.insertAdjacentElement('afterend', preview);

    const updateDisplay = () => {
        // 프로그램에서 입력 내용이 바뀌거나 번역/생성 중이어도 확장을 유지하지 않음.
        const focused = document.activeElement === ta;
        const open = focused && !keyboardDismissed && (keyboardVisible || pendingFocus);
        const content = ta.value;
        const firstLine = content.split(/\r\n|\n|\r/, 1)[0];
        preview.textContent = firstLine + (/[\r\n]/.test(content) ? '…' : '');
        form.classList.toggle('slk-compose-open', open);
        form.classList.toggle('slk-compose-previewing', !open && content.length > 0);
        document.body.classList.toggle('slk-composing', open);
    };

    const syncHeight = () => {
        const height = measure();
        const delta = height - lastHeight;
        const threshold = Math.max(105, maximumHeight * 0.13);

        // 중요: 첫 높이가 키보드 열린 상태였더라도, 커지는 변화만으로 닫힘 감지.
        if (delta > 100) {
            keyboardVisible = false;
            keyboardDismissed = true;
            pendingFocus = false;
        } else if (delta < -100) {
            keyboardVisible = true;
            keyboardDismissed = false;
            pendingFocus = false;
        } else if (maximumHeight - height > threshold && document.activeElement === ta) {
            keyboardVisible = true;
            keyboardDismissed = false;
            pendingFocus = false;
        } else if (keyboardVisible && maximumHeight - height < threshold / 2) {
            keyboardVisible = false;
            keyboardDismissed = true;
            pendingFocus = false;
        }

        if (height > maximumHeight) maximumHeight = height;
        lastHeight = height;
        updateDisplay();
    };

    const requestExpand = () => {
        pendingFocus = true;
        keyboardDismissed = false;
        updateDisplay();
        requestAnimationFrame(syncHeight);
    };
    // 키보드를 내린 후에도 동일 textarea에 포커스가 남았다면, 다음 직접 터치로 재확장.
    ta.addEventListener('pointerdown', requestExpand);
    ta.addEventListener('focus', requestExpand);
    ta.addEventListener('blur', () => {
        keyboardVisible = false;
        keyboardDismissed = true;
        pendingFocus = false;
        updateDisplay();
    });
    ta.addEventListener('input', updateDisplay);
    viewport?.addEventListener('resize', syncHeight);
    viewport?.addEventListener('scroll', syncHeight);
    window.addEventListener('resize', syncHeight);
    window.addEventListener('pageshow', syncHeight);
    window.addEventListener('orientationchange', () => {
        keyboardVisible = false;
        keyboardDismissed = true;
        pendingFocus = false;
        lastHeight = measure();
        maximumHeight = lastHeight;
        requestAnimationFrame(syncHeight);
    });
    form.addEventListener('mousedown', (e) => {
        if (document.activeElement === ta && !e.target.closest('#send_textarea')) e.preventDefault();
    });
    form.addEventListener('click', () => requestAnimationFrame(syncHeight));
    updateDisplay();
    setupMenuSwitch();
}

// ≡ 메뉴와 지팡이 메뉴는 하나만: 한쪽을 누르면 다른 쪽은 닫힘
function hideMenuEl(el) {
    if (!el || getComputedStyle(el).display === 'none') return;
    el.style.display = 'none';
    el.style.opacity = '0';
}

function setupMenuSwitch() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('#extensionsMenuButton')) hideMenuEl(document.getElementById('options'));
        else if (e.target.closest('#options_button')) hideMenuEl(document.getElementById('extensionsMenu'));
    }, true);
}

// ===================================================
// 채팅방 헤더: 채팅에 들어가면 ‹ 뒤로 + (프사 · 이름 · 💬 메시지 수)
// ===================================================
const CHAT_BUBBLE_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';

function stContext() {
    try {
        return window.SillyTavern?.getContext?.() ?? null;
    } catch {
        return null;
    }
}

function buildChatHead() {
    const header = document.getElementById('slk-header');
    if (!header || document.getElementById('slk-chat-head')) return;
    const head = document.createElement('div');
    head.id = 'slk-chat-head';
    head.innerHTML = `
        <button id="slk-chat-back" type="button" title="채팅 닫기">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button id="slk-chat-title" type="button" title="캐릭터 정보">
            <img class="slk-ch-av" alt="" hidden />
            <span class="slk-ch-text">
                <span class="slk-ch-name"></span>
                <span class="slk-ch-count">${CHAT_BUBBLE_SVG}<span class="slk-ch-n">0</span></span>
            </span>
        </button>
    `;
    header.prepend(head);

    head.querySelector('#slk-chat-back').addEventListener('click', () => {
        // ST의 '채팅 닫기' 메뉴와 같은 동작
        const btn = document.querySelector('#option_close_chat:not(.displayNone)') || document.querySelector('#option_close_chat');
        btn?.click();
    });
    head.querySelector('#slk-chat-title').addEventListener('click', () => {
        if (typeof DRAWERS !== 'undefined' && DRAWERS.character) navigateSlackPanel(DRAWERS.character);
    });
}

function chatInfo() {
    const ctx = stContext();
    let name = '';
    let avatar = '';
    let count = null;
    if (ctx) {
        if (Array.isArray(ctx.chat)) count = ctx.chat.length;
        if (ctx.groupId) {
            const g = (ctx.groups || []).find((x) => String(x.id) === String(ctx.groupId));
            name = g?.name || '';
        } else if (ctx.characterId !== undefined && ctx.characterId !== null && ctx.characters?.[ctx.characterId]) {
            const c = ctx.characters[ctx.characterId];
            name = c.name || '';
            if (c.avatar && c.avatar !== 'none') avatar = `/thumbnail?type=avatar&file=${encodeURIComponent(c.avatar)}`;
        }
    }
    // 화면에서 보충 (그룹 프사, 컨텍스트가 없을 때)
    const charMes = document.querySelector('#chat .mes[is_user="false"]:not([is_system="true"])');
    if (!name) name = charMes?.getAttribute('ch_name') || '';
    if (!avatar) avatar = charMes?.querySelector('.avatar img')?.getAttribute('src') || '';
    if (count === null) {
        const ids = [...document.querySelectorAll('#chat .mes[mesid]')].map((m) => Number(m.getAttribute('mesid')));
        count = ids.length ? Math.max(...ids) + 1 : 0;
    }
    return { name, avatar, count };
}

function syncChatHead() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    const inChat = !chat.querySelector('.welcomePanel') && !!chat.querySelector('.mes');
    document.body.classList.toggle('slk-in-chat', inChat);
    if (!inChat) return;
    const head = document.getElementById('slk-chat-head');
    if (!head) return;
    const { name, avatar, count } = chatInfo();
    head.querySelector('.slk-ch-name').textContent = name;
    const img = head.querySelector('.slk-ch-av');
    if (avatar) {
        if (img.getAttribute('src') !== avatar) img.setAttribute('src', avatar);
        img.hidden = false;
    } else {
        img.hidden = true;
    }
    head.querySelector('.slk-ch-n').textContent = Number(count).toLocaleString();
}

function watchChat() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    buildChatHead();
    let queued = false;
    const run = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            syncChatHead();
        });
    };
    new MutationObserver(run).observe(chat, { childList: true });
    const ctx = stContext();
    const types = ctx?.eventTypes || ctx?.event_types;
    if (ctx?.eventSource && types) {
        ['CHAT_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'MESSAGE_DELETED', 'CHARACTER_EDITED'].forEach((k) => {
            if (types[k]) ctx.eventSource.on(types[k], run);
        });
    }
    run();

    // 입력창 높이 → 채팅 아래 여백 (입력창이 채팅 위에 떠 있으므로)
    const form = document.getElementById('form_sheld');
    if (form && 'ResizeObserver' in window) {
        new ResizeObserver(() => {
            document.body.style.setProperty('--slk-form-h', `${form.offsetHeight}px`);
        }).observe(form);
    }
}

// ===================================================
// 헤더 접힘: 채팅방 밖에서 목록·패널을 스크롤하면 보라 헤더 → 유리 버튼
// ===================================================
const SCROLL_ROOTS = '#chat, .drawer-content, #left-nav-panel, #right-nav-panel';

function setHeaderCompact(on) {
    document.body.classList.toggle('slk-header-compact', !!on);
}

function openDrawerEl() {
    return document.querySelector('.drawer-content.openDrawer, #left-nav-panel.openDrawer, #right-nav-panel.openDrawer');
}

function recomputeHeaderCompact() {
    const open = openDrawerEl();
    if (open) {
        // 열린 패널 안에서 이미 스크롤된 곳이 있으면 접힌 상태 유지
        const scrolled = open.scrollTop > 10 || [...open.querySelectorAll('*')].some((el) => el.scrollTop > 10 && el.scrollHeight > el.clientHeight + 40);
        setHeaderCompact(scrolled);
    } else {
        setHeaderCompact((document.getElementById('chat')?.scrollTop || 0) > 10);
    }
}

function watchHeaderCompact() {
    // 실리태번 기본 드로어를 직접 눌렀을 때도, 클릭 핸들러보다 먼저 준비합니다.
    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('#top-settings-holder > .drawer > .drawer-toggle');
        if (toggle) primePanelHeader(`#${toggle.parentElement.id}`);
    }, true);
    document.addEventListener('scroll', (e) => {
        const t = e.target;
        if (!(t instanceof Element) || t.matches('textarea, select, input')) return;
        if (!t.closest(SCROLL_ROOTS)) return;
        // 패널이 열려 있으면 그 패널 안의 스크롤만, 아니면 채팅 영역 스크롤만 반영
        const open = openDrawerEl();
        if (open ? !open.contains(t) : t.id !== 'chat') return;
        setHeaderCompact(t.scrollTop > 10);
    }, true);
    document.addEventListener('click', (e) => {
        if (e.target.closest('.drawer-toggle, #slk-settings-menu, #slk-ws, #slk-chat-title')) setTimeout(recomputeHeaderCompact, 80);
    }, true);
}

// ===================================================
// 사용자 설정: 성격이 비슷한 항목끼리 탭으로 (테마 / 캐릭터 / 기타 / 채팅)
// 설정 검색 중에는 모든 탭을 같이 보여줌
// ===================================================
const US_TABS = [
    ['theme', '테마', svg('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>')],
    ['char', '캐릭터', svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')],
    ['misc', '기타', svg('<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>')],
    ['chat', '채팅', svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>')],
];

function tagUsBlocks() {
    const theme = document.getElementById('UI-Theme-Block');
    if (theme) theme.dataset.slkTab = 'theme';
    const cust = document.getElementById('UI-Customization');
    if (cust) {
        [...cust.children].forEach((el) => {
            el.dataset.slkTab = el.getAttribute('name') === 'CharacterHandlingToggles' ? 'char' : 'misc';
        });
    }
    const pu = document.getElementById('power-user-options-block');
    if (pu) pu.dataset.slkTab = 'chat';
}

function setUsTab(key) {
    const panel = document.getElementById('user-settings-block');
    if (!panel) return;
    panel.dataset.slkActiveTab = key;
    panel.querySelectorAll('#slk-ustabs .slk-aitab').forEach((b) => b.classList.toggle('active', b.dataset.tab === key));
    try { localStorage.setItem('slk-us-tab', key); } catch { /* 무시 */ }
}

function buildUsTabs() {
    const panel = document.getElementById('user-settings-block');
    const content = document.getElementById('user-settings-block-content');
    if (!panel || !content || document.getElementById('slk-ustabs')) return;
    const bar = document.createElement('div');
    bar.id = 'slk-ustabs';
    bar.setAttribute('role', 'tablist');
    bar.innerHTML = US_TABS.map(([key, label, icon]) =>
        `<button type="button" class="slk-aitab" role="tab" data-tab="${key}">${icon}<span>${label}</span></button>`).join('');
    content.insertAdjacentElement('beforebegin', bar);
    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.slk-aitab');
        if (!btn) return;
        setUsTab(btn.dataset.tab);
        if (panel.scrollTop > bar.offsetTop) panel.scrollTop = bar.offsetTop;
    });
    tagUsBlocks();
    let saved = 'theme';
    try { saved = localStorage.getItem('slk-us-tab') || 'theme'; } catch { /* 기본값 */ }
    setUsTab(US_TABS.some(([k]) => k === saved) ? saved : 'theme');

    const search = document.getElementById('settingsSearch');
    if (search) {
        const sync = () => { panel.dataset.slkSearching = search.value.trim() ? '1' : ''; };
        search.addEventListener('input', sync);
        sync();
    }
}

// ===================================================
// 7개 바텀 탭 + 사용자 설정 · 배경이 열려 있으면 헤더 왼쪽에 ‹ 뒤로 (패널 닫기)
// ===================================================
function buildPanelBack() {
    const header = document.getElementById('slk-header');
    if (!header || document.getElementById('slk-panel-back')) return;
    const btn = document.createElement('button');
    btn.id = 'slk-panel-back';
    btn.type = 'button';
    btn.title = '닫기';
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span class="slk-back-title" data-for="userSettings">사용자 설정</span>
        <span class="slk-back-title" data-for="backgrounds">배경</span>
    `;
    const ws = document.getElementById('slk-ws');
    if (ws) ws.insertAdjacentElement('beforebegin', btn);
    else header.prepend(btn);
    for (const type of ['touchstart', 'mousedown']) {
        btn.addEventListener(type, (event) => event.stopPropagation());
    }
    btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Close the top drawer. Revealing the lower layer is a side effect of closing.
        if (SLK_UI_SETTINGS.enabled && window.matchMedia('(max-width: 1000px)').matches && window.__slkPanelNavigation) {
            window.__slkPanelNavigation.back();
            return;
        }
        // Native fallback: close only the currently active drawer.
        const selectors = [...new Set([...TABS.map(([selector]) => selector), DRAWERS.userSettings, DRAWERS.backgrounds])];
        const active = selectors.find(selector => {
            const drawer = document.querySelector(selector);
            return drawer && (drawer.classList.contains('openDrawer') ||
                drawer.querySelector('.drawer-icon.openIcon, .drawer-content.openDrawer'));
        });
        if (active) openDrawer(active);
        setTimeout(recomputeHeaderCompact, 80);
    });
}


// v1.4.16: 외부 확장마다 다른 하늘색 글씨/아이콘만 중립 회색으로.
// 모든 텍스트를 일괄 회색으로 만들지 않고 실제 계산된 RGB 색으로 판별한다.
function setupExtensionNeutralColors() {
    const panel = document.getElementById('rm_extensions_block');
    if (!panel || panel.dataset.slkBlueNeutralizer) return;
    panel.dataset.slkBlueNeutralizer = '1';
    const mq = window.matchMedia('(max-width: 1000px)');
    const isLightBlue = (raw) => {
        if (!raw || raw === 'none' || raw === 'currentcolor') return false;
        const m = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
        if (!m) return false;
        const [r, g, b] = m.slice(1, 4).map(Number);
        // pale/cyan-blue, not neutral gray, dark purple, normal black or green.
        return b >= 155 && g >= 105 && b - r >= 13 && b - g >= 6 && r >= 80;
    };
    let queued = false;
    const neutralize = () => {
        queued = false;
        if (!mq.matches || !SLK_UI_SETTINGS.enabled) return;
        const els = [panel, ...panel.querySelectorAll('*')];
        for (const el of els) {
            if (el.matches('input[type="color"], option, canvas, .color-picker, .color-picker *')) continue;
            const s = getComputedStyle(el);
            // Inline !important intentionally wins over external extension CSS.
            if (isLightBlue(s.color)) el.style.setProperty('color', '#858585', 'important');
            const fill = s.getPropertyValue('-webkit-text-fill-color');
            if (isLightBlue(fill)) el.style.setProperty('-webkit-text-fill-color', '#858585', 'important');
            if (el instanceof SVGElement) {
                if (isLightBlue(s.stroke)) el.style.setProperty('stroke', '#858585', 'important');
                if (isLightBlue(s.fill)) el.style.setProperty('fill', '#858585', 'important');
            }
        }
    };
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(neutralize);
    };
    const obs = new MutationObserver(records => {
        // Ignore changes made by our own neutralizer to avoid a style loop.
        if (records.every(r => r.type === 'attributes' && r.attributeName === 'style' &&
            r.target?.style?.getPropertyValue('color') === 'rgb(133, 133, 133)')) return;
        schedule();
    });
    obs.observe(panel, {subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'disabled', 'aria-selected']});
    panel.addEventListener('click', schedule, true);
    panel.addEventListener('change', schedule, true);
    window.addEventListener('load', schedule, {once:true});
    mq.addEventListener?.('change', schedule);
    schedule();
    setTimeout(schedule, 500); // dynamically loaded third-party extension tabs
    setTimeout(schedule, 1600);
}

function init() {
    applySlackUiSettings();
    buildSlackUiExtensionSettings();
    if (!document.getElementById('slk-extension-settings')) {
        setTimeout(buildSlackUiExtensionSettings, 500);
        setTimeout(buildSlackUiExtensionSettings, 1500);
    }
    preventInputZoom();
    relabelPersonaButtons();
    setTimeout(relabelPersonaButtons, 1500);
    buildHeader();
    buildPanelBack();
    buildTabIcons();
    buildAiTabs();
    buildUsTabs();
    watchWorldInfo();
    setupExtensionNeutralColors();
    setupPersonaAccordion();
    watchCharView();
    setupComposer();
    watchChat();
    watchHeaderCompact();
    updateHeader();

}

if (window.jQuery) window.jQuery(init);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();


// === MOBILE FOOTER-ONLY FIX v1.4.11 ===
// 모바일에서 원본 드로어 DOM을 옮기거나 삭제하지 않고, 독립 바텀바만 표시합니다.
(function mountSlackMobileFooter() {
    const mq = window.matchMedia('(max-width: 1000px)');
    const setImportant = (el, styles) => {
        for (const [key, value] of Object.entries(styles)) el.style.setProperty(key, value, 'important');
    };
    let footerObserver = null;
    let composerObserver = null;
    let footerSwitchSerial = 0;

    // v1.4.25: A single, synchronous controller for mobile drawers.
    // SillyTavern's doNavbarIconClick() is async: when a different drawer is
    // open it waits animation_duration before opening the next one. Calling
    // native toggles repeatedly during this wait caused persona/character
    // flicker and reopened an unrelated drawer after Back.
    const panelHistory = [];
    const managedSelectors = [...new Set([...TABS.map(([selector]) => selector), DRAWERS.userSettings, DRAWERS.backgrounds])];
    let navigationUsed = false;
    let desiredSelector = null;

    function getDrawerParts(selector) {
        const root = document.querySelector(selector);
        if (!root) return null;
        const content = root.querySelector(':scope > .drawer-content');
        const icon = root.querySelector(':scope > .drawer-toggle .drawer-icon');
        if (!content || !icon) return null;
        return {root, content, icon};
    }

    function isFooterDrawerOpen(root) {
        if (!root) return false;
        return !!root.querySelector(':scope > .drawer-content.openDrawer');
    }

    function rememberScroll(layer) {
        if (!layer) return;
        const root = document.querySelector(layer.selector);
        if (!root) return;
        const nodes = [root, ...root.querySelectorAll('.drawer-content, .scrollableInner, .scrollable, .right_menu, #WorldInfo')];
        layer.scroll = nodes.filter(node => node.scrollTop > 0).map(node => ({ node, top: node.scrollTop }));
    }

    function restoreScroll(layer) {
        if (!layer?.scroll?.length) return;
        const restore = () => layer.scroll.forEach(({node, top}) => {
            if (node.isConnected) node.scrollTop = top;
        });
        requestAnimationFrame(restore);
    }

    function applyManagedVisibility() {
        if (!navigationUsed || !mq.matches || !SLK_UI_SETTINGS.enabled) {
            document.body.classList.remove('slk-managed-navigation', 'slk-no-panel');
            for (const selector of managedSelectors) {
                getDrawerParts(selector)?.content.classList.remove('slk-nav-hidden');
            }
            return;
        }
        document.body.classList.add('slk-managed-navigation');
        document.body.classList.toggle('slk-no-panel', !desiredSelector);
        for (const selector of managedSelectors) {
            getDrawerParts(selector)?.content.classList.toggle('slk-nav-hidden', selector !== desiredSelector);
        }
    }

    function setNativeDrawerState(selector, shouldOpen) {
        const parts = getDrawerParts(selector);
        if (!parts) return;
        const { content, icon } = parts;
        // Update both flags in the same JS task; never call the native async
        // toggle here, and never create delayed callbacks that can undo state.
        content.classList.toggle('openDrawer', shouldOpen);
        content.classList.toggle('closedDrawer', !shouldOpen);
        icon.classList.toggle('openIcon', shouldOpen);
        icon.classList.toggle('closedIcon', !shouldOpen);
        if (shouldOpen && selector === DRAWERS.character) {
            document.getElementById('rm_print_characters_block')?.dispatchEvent(new Event('scroll'));
        }
    }

    function transitionTo(selector, layer) {
        navigationUsed = true;
        desiredSelector = selector;
        // Clear any legacy delayed header-transition indicator. Only the
        // selected panel receives native open flags; no other panel is opened.
        document.body.classList.remove('slk-panel-opening');
        for (const item of managedSelectors) {
            setNativeDrawerState(item, item === selector);
        }
        applyManagedVisibility();
        document.body.classList.remove('slk-header-compact');
        updateActive();
        restoreScroll(layer);
        // Compact state will be calculated from the selected visible panel.
        requestAnimationFrame(recomputeHeaderCompact);
    }

    // 지금 화면에 실제로 보이는 패널 (ST가 직접 연 경우 포함)
    function visibleSelector() {
        if (navigationUsed && desiredSelector) return desiredSelector;
        return managedSelectors.find(sel => {
            const parts = getDrawerParts(sel);
            if (!parts) return false;
            if (parts.content.classList.contains('slk-nav-hidden')) return false;
            return getComputedStyle(parts.content).display !== 'none' &&
                (parts.content.classList.contains('openDrawer') || parts.content.getBoundingClientRect().height > 0);
        }) || null;
    }

    function closeAll() {
        panelHistory.length = 0;
        transitionTo(null, null);
        // 안전장치: 닫은 뒤에도 남아 있는 패널은 한 번 더 숨김
        setTimeout(() => {
            if (desiredSelector) return;
            for (const sel of managedSelectors) setNativeDrawerState(sel, false);
            applyManagedVisibility();
            updateActive();
            recomputeHeaderCompact();
        }, 120);
    }

    function navigate(selector) {
        if (!managedSelectors.includes(selector) || !getDrawerParts(selector)) return;
        if (!mq.matches || !SLK_UI_SETTINGS.enabled) {
            openDrawer(selector);
            return;
        }
        const top = panelHistory.at(-1);
        if (top?.selector === selector || (!top && visibleSelector() === selector)) {
            back(); // Clicking the active tab closes the current layer.
            return;
        }
        rememberScroll(top);
        const layer = {selector};
        panelHistory.push(layer);
        transitionTo(selector, layer);
    }

    function back() {
        if (!mq.matches || !SLK_UI_SETTINGS.enabled) return;
        // 뒤로가기 / 열린 탭 다시 누르기 = 이전 탭으로 돌아가지 않고 패널을 닫음
        closeAll();
    }

    window.__slkPanelNavigation = {
        navigate, back,
        getHistory: () => panelHistory.map(layer => layer.selector),
        getCurrent: () => desiredSelector,
    };

    function updateActive() {
        const footer = document.getElementById('slk-mobile-footer');
        if (!footer) return;
        for (const btn of footer.querySelectorAll('.slk-footer-tab')) {
            const active = navigationUsed
                ? btn.dataset.drawer === desiredSelector
                : isFooterDrawerOpen(document.querySelector(btn.dataset.drawer));
            btn.setAttribute('aria-pressed', String(active));
            const dark = SLK_UI_SETTINGS.theme === 'dark';
            btn.style.setProperty('background', active ? (dark ? '#3E2941' : '#EFEAF0') : 'transparent', 'important');
            btn.style.setProperty('color', active ? (dark ? '#F3C8F8' : '#4A154B') : (dark ? '#B1B1B1' : '#616061'), 'important');
        }
    }

    // The composer toggles body.slk-composing when its expanded UI is active.
    // The independent footer is an <html> child with inline !important styles,
    // so its visibility must be synchronized directly instead of CSS-only.
    function syncComposerFooter() {
        if (!mq.matches || !SLK_UI_SETTINGS.enabled) return;
        const footer = document.getElementById('slk-mobile-footer');
        if (!footer) return;
        const expanded = document.body.classList.contains('slk-composing') ||
            !!document.getElementById('send_form')?.classList.contains('slk-compose-open');
        footer.style.setProperty('display', expanded ? 'none' : 'flex', 'important');
        footer.setAttribute('aria-hidden', String(expanded));
    }

    function mount() {
        if (!document.body) return;
        const mobile = mq.matches && SLK_UI_SETTINGS.enabled;
        let footer = document.getElementById('slk-mobile-footer');
        if (!mobile) {
            if (footer) footer.style.setProperty('display', 'none', 'important');
            document.body.classList.remove('slk-footer-only-active');
            return;
        }
        if (!footer) {
            footer = document.createElement('nav');
            footer.id = 'slk-mobile-footer';
            footer.setAttribute('aria-label', '실리태번 모바일 하단 탭');
            // 기존 7개 탭과 SVG 아이콘 재사용. 홈 탭 추가 없음.
            for (const [drawer, icon, label] of TABS) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'slk-footer-tab';
                btn.dataset.drawer = drawer;
                btn.setAttribute('aria-label', label);
                btn.title = label;
                btn.innerHTML = ICONS[icon];
                setImportant(btn, {
                    'display': 'grid', 'place-items': 'center', 'flex': '1 1 0',
                    'min-width': '0', 'max-width': '52px', 'height': '44px',
                    'margin': '0', 'padding': '0', 'border': '0',
                    'border-radius': '999px', 'background': 'transparent',
                    'color': '#616061', 'box-shadow': 'none',
                    'appearance': 'none', '-webkit-appearance': 'none',
                    'opacity': '1', 'visibility': 'visible', 'pointer-events': 'auto',
                    'cursor': 'pointer'
                });
                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    navigate(drawer);
                });
                footer.appendChild(btn);
            }
            // Keep the footer outside <body>: some SillyTavern themes make <body>
            // a zero-height containing block for position:fixed elements.
            document.documentElement.appendChild(footer);
            // Prevent native html-level auto-close before navigation.click.
            for (const type of ['touchstart', 'mousedown']) {
                footer.addEventListener(type, event => event.stopPropagation());
            }
            footerObserver = new MutationObserver(updateActive);
            const holder = document.getElementById('top-settings-holder');
            if (holder) footerObserver.observe(holder, { attributes: true, subtree: true, attributeFilter: ['class'] });
            window.__slkMobileFooterVersion = '1.4.26';
        }
        // Keep an existing footer out of any clipped/transformed body containing block.
        if (footer.parentElement !== document.documentElement) document.documentElement.appendChild(footer);
        // 모바일의 위치·표시를 인라인 !important로 고정. 외부 테마의 선택자보다 우선합니다.
        const dark = SLK_UI_SETTINGS.theme === 'dark';
        setImportant(footer, {
            'position': 'fixed', 'display': 'flex', 'visibility': 'visible',
            'opacity': '1', 'pointer-events': 'auto', 'box-sizing': 'border-box',
            'left': '12px', 'right': '12px', 'width': 'auto',
            'top': 'calc(100dvh - 70px - env(safe-area-inset-bottom, 0px))',
            'bottom': 'auto',
            'height': '60px', 'min-height': '60px', 'max-height': '60px',
            'margin': '0', 'padding': '0 6px',
            'align-items': 'center', 'justify-content': 'space-around',
            'flex-direction': 'row', 'overflow': 'visible',
            'border': dark ? '1px solid rgba(255,255,255,.17)' : '1px solid rgba(255,255,255,.75)',
            'border-radius': '999px',
            'background': dark ? 'rgba(30,30,30,.38)' : 'rgba(255,255,255,.22)',
            'box-shadow': '0 8px 28px rgba(0,0,0,.10), inset 0 1px 0 rgba(255,255,255,.65)',
            'backdrop-filter': 'blur(14px) saturate(200%)',
            '-webkit-backdrop-filter': 'blur(14px) saturate(200%)',
            'transform': 'none', 'filter': 'none', 'z-index': '2147483646'
        });
        document.body.classList.add('slk-footer-only-active');
        if (!composerObserver) {
            composerObserver = new MutationObserver(syncComposerFooter);
            composerObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            const form = document.getElementById('send_form');
            if (form) composerObserver.observe(form, { attributes: true, attributeFilter: ['class'] });
        }
        syncComposerFooter();
        applyManagedVisibility();
        updateActive();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
    mq.addEventListener?.('change', mount);
    window.addEventListener('pageshow', mount);
    window.addEventListener('slk-ui-settings-changed', mount);
})();

// v1.4.26 — Keep the extension manager toolbar solid and above its scrolling
// list.  Native modal <dialog> elements are in the browser top layer, so a
// body/html toast cannot appear above them even with maximum z-index.
// While a popup is open, move the existing toastr container INTO the topmost
// dialog; when it closes return that same container to <html>.
(function mountSlackOverlayLayer() {
    let lastToast = null;
    let queued = false;
    let syncing = false;
    const isMobileSlack = () => document.body?.classList.contains('slk-ui') &&
        matchMedia('(max-width: 1000px)').matches;

    function sync() {
        if (syncing || !document.body) return;
        syncing = true;
        try {
            const enabled = isMobileSlack();
            if (enabled) {
                // The manager header is a direct child of the popup body, NOT
                // of the scrollable popup-content. Its buttons retain handlers.
                for (const dialog of document.querySelectorAll('dialog.popup:has(.extensions_info)')) {
                    const toolbar = dialog.querySelector('.extensions_info > .extensions_toolbar');
                    const body = dialog.querySelector('.popup-body');
                    const content = body?.querySelector('.popup-content');
                    if (toolbar && body && content) {
                        toolbar.classList.add('slk-manager-toolbar');
                        body.insertBefore(toolbar, content);
                    }
                }
            }

            const openModals = enabled ? [...document.querySelectorAll('dialog.popup[open]')] : [];
            const target = openModals.at(-1) || document.documentElement;
            let toast = document.getElementById('toast-container');
            // If closing a modal detached the container along with it,
            // recover the original node without discarding ongoing notices.
            if (!toast && lastToast && !lastToast.isConnected &&
                lastToast.parentElement?.closest('dialog.popup')) {
                toast = lastToast;
            }
            if (toast) {
                lastToast = toast;
                if (toast.parentElement !== target) target.appendChild(toast);
            }
        } finally {
            syncing = false;
        }
    }

    function schedule() {
        if (queued) return;
        queued = true;
        queueMicrotask(() => { queued = false; sync(); });
    }

    function relevant(nodes) {
        return [...nodes].some(node => node.nodeType === 1 &&
            (node.matches?.('dialog.popup, #toast-container, .extensions_info, .extensions_toolbar') ||
             node.querySelector?.('dialog.popup, #toast-container, .extensions_info, .extensions_toolbar')));
    }

    function watch() {
        if (!document.documentElement) return;
        const observer = new MutationObserver(changes => {
            if (changes.some(change =>
                (change.type === 'attributes' && change.attributeName === 'open') ||
                (change.type === 'childList' && (relevant(change.addedNodes) || relevant(change.removedNodes))))) {
                schedule();
            }
        });
        observer.observe(document.documentElement, {
            subtree: true, childList: true, attributes: true, attributeFilter: ['open']
        });
        sync();
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', watch, {once:true});
    else watch();
    window.addEventListener('slk-ui-settings-changed', schedule);
    window.addEventListener('pageshow', schedule);
})();


// v1.4.35 — fix only the active-world selector in the Lorebook panel.
// Keep its title INSIDE its own bordered control (never in a separate column).
(function slkContainActiveWorldPicker() {
    const query = '(max-width: 1200px)';
    let observedPicker = null;
    let pickerObserver = null;
    const overridden = new Map();
    const important = (el, key, value) => {
        if (!el) return;
        if (!overridden.has(el)) overridden.set(el, new Map());
        const original = overridden.get(el);
        if (!original.has(key)) original.set(key, [el.style.getPropertyValue(key), el.style.getPropertyPriority(key)]);
        el.style.setProperty(key, value, 'important');
    };
    function restore() {
        pickerObserver?.disconnect();
        pickerObserver = null;
        observedPicker = null;
        for (const [element, properties] of overridden) {
            for (const [key, [value, priority]] of properties) {
                if (value) element.style.setProperty(key, value, priority);
                else element.style.removeProperty(key);
            }
        }
        overridden.clear();
    }

    function update() {
        const picker = document.getElementById('WIMultiSelector');
        if (!picker || !document.body?.classList.contains('slk-ui') || !matchMedia(query).matches) {
            if (overridden.size) restore();
            return;
        }
        const title = picker.querySelector(':scope > .range-block-title');
        const field = picker.querySelector(':scope > .range-block-range');
        if (!title || !field) return;

        important(picker, 'display', 'grid');
        important(picker, 'grid-template-columns', 'minmax(0, 1fr)');
        important(picker, 'grid-template-rows', 'auto auto');
        important(picker, 'width', '100%');
        important(picker, 'min-width', '0');
        important(picker, 'max-width', '100%');
        important(picker, 'flex', '0 0 auto');
        for (const [el, row] of [[title, '1'], [field, '2']]) {
            important(el, 'display', 'block');
            important(el, 'grid-column', '1');
            important(el, 'grid-row', row);
            important(el, 'width', '100%');
            important(el, 'min-width', '0');
            important(el, 'max-width', '100%');
            important(el, 'margin-left', '0');
            important(el, 'margin-right', '0');
        }
        for (const el of picker.querySelectorAll('.select2-container, .select2-selection--multiple')) {
            important(el, 'width', '100%');
            important(el, 'min-width', '0');
            important(el, 'max-width', '100%');
        }
        if (picker !== observedPicker) {
            pickerObserver?.disconnect();
            observedPicker = picker;
            pickerObserver = new MutationObserver(update);
            pickerObserver.observe(picker, { childList: true, subtree: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update, { once: true });
    else update();
    addEventListener('pageshow', update);
    addEventListener('resize', update);
    addEventListener('slk-ui-settings-changed', update);
})();

// v1.4.37 — 로어북 '모든 채팅에 대한 활성화된 월드 인포': 한 줄 드롭다운(여러 개 선택)
(function slkWorldDropdown() {
    const PLACEHOLDER = '선택 안 됨';
    let wrap, btn, label, menu, sel, sig = '';

    const jq = () => window.jQuery || window.$;
    const signature = () => sel ? [...sel.options].map(o => (o.selected ? '1' : '0') + o.text).join('|') : '';

    const renderLabel = () => {
        if (!sel || !label) return;
        const picked = [...sel.options].filter(o => o.selected && o.value !== '').map(o => o.text);
        label.textContent = picked.length ? picked.join(', ') : PLACEHOLDER;
        label.classList.toggle('is-empty', !picked.length);
    };

    const renderMenu = () => {
        if (!sel || !menu) return;
        menu.textContent = '';
        const opts = [...sel.options].filter(o => o.value !== '');
        if (!opts.length) {
            const e = document.createElement('div');
            e.className = 'slk-wi-dd-empty';
            e.textContent = '로어북이 없어요';
            menu.appendChild(e);
            return;
        }
        const anyOn = opts.some(o => o.selected);
        [null, ...opts].forEach(o => {
            const it = document.createElement('button');
            it.type = 'button';
            const on = o ? o.selected : !anyOn;
            it.className = 'slk-wi-dd-item' + (on ? ' is-on' : '') + (o ? '' : ' is-none');
            it.textContent = o ? o.text : PLACEHOLDER;
            it.addEventListener('click', ev => {
                ev.preventDefault();
                ev.stopPropagation();
                // 여러 개 선택: 항목은 켜고 끄기, '선택 안 됨'은 전부 해제
                if (o) o.selected = !o.selected;
                else [...sel.options].forEach(x => { x.selected = false; });
                fire();
                sync(true);
            });
            menu.appendChild(it);
        });
    };

    const fire = () => {
        const $ = jq();
        if ($) $(sel).trigger('change');
        else sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // 1회: 예전 여러 줄 목록에서 실수로 켜진 선택을 모두 해제하고 '선택 안 됨'으로 시작
    const RESET_KEY = 'slk-wi-reset-1438';
    let resetTimer = null;
    const resetOnce = () => {
        try { if (localStorage.getItem(RESET_KEY)) return; } catch (e) { return; }
        if (!sel || !sel.options.length || resetTimer) return;
        resetTimer = setTimeout(() => {
            if ([...sel.options].some(o => o.selected)) {
                [...sel.options].forEach(o => { o.selected = false; });
                fire();
            }
            try { localStorage.setItem(RESET_KEY, '1'); } catch (e) {}
            sync(true);
        }, 2500);
    };

    const sync = (force) => {
        resetOnce();
        const now = signature();
        if (!force && now === sig) return;
        sig = now;
        renderLabel();
        if (wrap && wrap.classList.contains('is-open')) renderMenu();
    };

    const close = () => wrap && wrap.classList.remove('is-open');

    const build = () => {
        sel = document.getElementById('world_info');
        if (!sel || document.getElementById('slk-wi-dd')) return !!sel;
        wrap = document.createElement('div');
        wrap.id = 'slk-wi-dd';
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slk-wi-dd-btn';
        label = document.createElement('span');
        label.className = 'slk-wi-dd-label';
        btn.appendChild(label);
        menu = document.createElement('div');
        menu.className = 'slk-wi-dd-menu';
        wrap.append(btn, menu);
        sel.insertAdjacentElement('afterend', wrap);
        // select2 컨테이너가 있으면 그 뒤로
        const s2 = sel.nextElementSibling && sel.nextElementSibling.classList.contains('select2-container') ? sel.nextElementSibling : null;
        if (s2) s2.insertAdjacentElement('afterend', wrap);

        btn.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            const open = !wrap.classList.contains('is-open');
            wrap.classList.toggle('is-open', open);
            if (open) renderMenu();
        });
        document.addEventListener('click', ev => { if (wrap && !wrap.contains(ev.target)) close(); }, true);
        sel.addEventListener('change', () => sync(true));
        const $ = jq();
        if ($) $(sel).on('change.slkdd', () => sync(true));
        new MutationObserver(() => sync(true)).observe(sel, { childList: true, subtree: true, attributes: true });
        setInterval(() => { if (wrap.offsetParent) sync(false); }, 700);
        sync(true);
        return true;
    };

    const start = () => {
        if (build()) return;
        const mo = new MutationObserver(() => { if (build()) mo.disconnect(); });
        mo.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.40 — 로어북 항목 '캐릭터/태그 필터', '생성 트리거 필터'도 한 줄 드롭다운(여러 개 선택)
(function slkEntryFilterDropdowns() {
    const CONF = {
        characterFilter: '전체 캐릭터 (필터 없음)',
        triggers: '전체 생성 유형 (필터 없음)',
    };
    const SEL = Object.keys(CONF).map(n => `#WorldInfo select[name="${n}"][multiple]`).join(',');

    const fire = (sel) => {
        const $ = window.jQuery || window.$;
        if ($) { $(sel).trigger('input').trigger('change'); }
        else {
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const attach = (sel) => {
        if (sel.dataset.slkDd) return;
        sel.dataset.slkDd = '1';
        const placeholder = CONF[sel.name] || '선택 안 됨';
        const wrap = document.createElement('div');
        wrap.className = 'slk-dd';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slk-dd-btn';
        const label = document.createElement('span');
        label.className = 'slk-dd-label';
        btn.appendChild(label);
        const menu = document.createElement('div');
        menu.className = 'slk-dd-menu';
        wrap.append(btn, menu);
        const s2 = sel.nextElementSibling && sel.nextElementSibling.classList.contains('select2-container') ? sel.nextElementSibling : sel;
        s2.insertAdjacentElement('afterend', wrap);

        const opts = () => [...sel.options].filter(o => o.value !== '' && !o.disabled);
        const renderLabel = () => {
            const picked = opts().filter(o => o.selected).map(o => o.text.trim());
            label.textContent = picked.length ? picked.join(', ') : placeholder;
            label.classList.toggle('is-empty', !picked.length);
        };
        const renderMenu = () => {
            menu.textContent = '';
            const list = opts();
            const anyOn = list.some(o => o.selected);
            [null, ...list].forEach(o => {
                const it = document.createElement('button');
                it.type = 'button';
                const on = o ? o.selected : !anyOn;
                it.className = 'slk-dd-item' + (on ? ' is-on' : '') + (o ? '' : ' is-none');
                it.textContent = o ? o.text.trim() : placeholder;
                it.addEventListener('click', ev => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (o) o.selected = !o.selected;
                    else [...sel.options].forEach(x => { x.selected = false; });
                    fire(sel);
                    renderLabel();
                    renderMenu();
                });
                menu.appendChild(it);
            });
        };
        btn.addEventListener('click', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            const open = !wrap.classList.contains('is-open');
            document.querySelectorAll('.slk-dd.is-open').forEach(x => x.classList.remove('is-open'));
            wrap.classList.toggle('is-open', open);
            if (open) renderMenu();
        });
        sel.addEventListener('change', renderLabel);
        const $ = window.jQuery || window.$;
        if ($) $(sel).on('change.slkdd', renderLabel);
        new MutationObserver(() => { renderLabel(); if (wrap.classList.contains('is-open')) renderMenu(); })
            .observe(sel, { childList: true, subtree: true, attributes: true });
        renderLabel();
        // ST가 선택값을 나중에 채우는 경우 대비
        setTimeout(renderLabel, 300);
        setTimeout(renderLabel, 1200);
    };

    const scan = () => document.querySelectorAll(SEL).forEach(attach);
    document.addEventListener('click', ev => {
        document.querySelectorAll('.slk-dd.is-open').forEach(w => { if (!w.contains(ev.target)) w.classList.remove('is-open'); });
    }, true);
    const start = () => {
        scan();
        let t = null;
        new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = null; scan(); }, 120); })
            .observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.46 — 알림: (1) 확장이 직접 띄우는 '진행 중' 알림(번역 중 등)도 슬랙 카드로,
//               (2) 진행 중 알림을 뺀 나머지 알림은 누르면 사라짐
(function slkNotices() {
    const SPIN = '.fa-spin, .fa-spinner, .fa-circle-notch, .fa-pulse, [class*="spinner"], [class*="loading"], [class*="loader"]';
    const isProgress = (el) => !!el.querySelector(SPIN) || /중입니다|중이에요|\.\.\.\s*$|…\s*$/.test((el.textContent || '').trim());

    // (1) 고정 위치의 작은 진행 알림 찾기 (toast-container 바깥)
    const markNotices = () => {
        if (!document.body || !document.body.classList.contains('slk-ui')) return;
        document.querySelectorAll(SPIN).forEach(sp => {
            if (sp.closest('#toast-container, .slk-notice, #send_form, #chat .mes, dialog, #slk-header, #slk-mobile-footer')) return;
            let el = sp.parentElement, hops = 0;
            while (el && el !== document.body && hops < 6) {
                const cs = getComputedStyle(el);
                if (cs.position === 'fixed' || cs.position === 'sticky') {
                    const r = el.getBoundingClientRect();
                    if (r.height > 0 && r.height < 180 && r.width < innerWidth && (el.textContent || '').trim().length < 240) {
                        el.classList.add('slk-notice');
                    }
                    return;
                }
                el = el.parentElement; hops++;
            }
        });
    };
    let t = null;
    const schedule = () => { if (t) return; t = setTimeout(() => { t = null; markNotices(); }, 60); };
    const start = () => {
        markNotices();
        new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();

    // (2) 누르면 닫기 (진행 중 알림 제외)
    document.addEventListener('click', ev => {
        if (!document.body || !document.body.classList.contains('slk-ui')) return;
        const toast = ev.target.closest && ev.target.closest('#toast-container > div');
        if (!toast || isProgress(toast)) return;
        if (ev.target.closest('a, input, select, textarea') && !ev.target.closest('.toast-close-button')) return;
        const $ = window.jQuery || window.$;
        if (window.toastr && $) { window.toastr.clear($(toast), { force: true }); }
        setTimeout(() => {
            if (!toast.isConnected) return;
            toast.style.transition = 'opacity .15s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 160);
        }, 60);
    }, true);
})();

// v1.4.47 — 일반 알림은 시간이 지나면 사라짐 (진행 중 알림 제외).
// toastr가 시간 0(계속 표시)으로 띄운 알림도 5초 뒤 닫음.
(function slkToastAutoClose() {
    const SPIN = '.fa-spin, .fa-spinner, .fa-circle-notch, .fa-pulse, [class*="spinner"], [class*="loading"], [class*="loader"]';
    const isProgress = (el) => !!el.querySelector(SPIN) || /중입니다|중이에요|\.\.\.\s*$|…\s*$/.test((el.textContent || '').trim());
    const DELAY = 5000;
    const seen = new WeakSet();
    const closeToast = (toast) => {
        if (!toast.isConnected) return;
        const $ = window.jQuery || window.$;
        if (window.toastr && $) { try { window.toastr.clear($(toast), { force: true }); } catch (e) {} }
        setTimeout(() => {
            if (!toast.isConnected) return;
            toast.style.transition = 'opacity .2s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 220);
        }, 400);
    };
    const arm = (toast) => {
        if (seen.has(toast)) return;
        seen.add(toast);
        const tick = () => {
            if (!toast.isConnected) return;
            if (isProgress(toast)) { setTimeout(tick, 1000); return; } // 진행 중이면 끝날 때까지 기다림
            closeToast(toast);
        };
        setTimeout(tick, DELAY);
    };
    const scan = () => document.querySelectorAll('#toast-container > div').forEach(arm);
    const start = () => {
        scan();
        new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.52 — 받은 확장 설정: 토글 스위치·세그먼트 버튼을 구조로 찾아서 슬랙 모양으로
(function slkExtensionControls() {
    const ROOT = '#rm_extensions_block';
    const shown = (el) => !!el && el.getClientRects().length > 0;
    const isHiddenInput = (el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none' || r.width <= 2 || r.height <= 2;
    };

    const markSwitches = (root) => {
        root.querySelectorAll('.inline-drawer-content input[type="checkbox"]:not([data-slk-sw])').forEach(input => {
            if (input.closest('#slk-extension-settings')) { input.dataset.slkSw = 'own'; return; }
            const host = input.parentElement;
            if (!shown(host)) return; // 펼쳐졌을 때 다시
            const r = input.getBoundingClientRect();
            // (1) 체크박스 자체가 스위치 모양
            if (!isHiddenInput(input) && r.width >= 28 && r.width > r.height * 1.3) {
                input.dataset.slkSw = 'self';
                input.classList.add('slk-switch-input');
                return;
            }
            // (2) 체크박스는 숨겨져 있고 옆에 확장이 그린 손잡이/트랙 → 우리 스위치로 교체
            if (!isHiddenInput(input)) { input.dataset.slkSw = 'none'; return; }
            const sib = input.nextElementSibling;
            const looksLikeKnob = (el) => el && el.tagName !== 'INPUT' && !(el.textContent || '').trim() && el.querySelectorAll('*').length <= 3;
            if (!looksLikeKnob(sib)) { input.dataset.slkSw = 'none'; return; }
            input.dataset.slkSw = 'track';
            sib.classList.add('slk-sw-orig');
            const sw = document.createElement('span');
            sw.className = 'slk-sw';
            sw.setAttribute('aria-hidden', 'true');
            sib.insertAdjacentElement('afterend', sw);
            // 래퍼(label 등)가 스위치 크기로 고정돼 있으면 풀어줌
            if (!(host.textContent || '').trim()) host.classList.add('slk-sw-host');
            const sync = () => sw.classList.toggle('slk-on', input.checked);
            sync();
            input.addEventListener('change', sync);
            new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['checked'] });
            setInterval(() => { if (sw.isConnected) sync(); }, 700);
            if (!input.closest('label')) {
                sw.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); input.click(); });
            }
        });
    };

    const OPT = 'button, [role="radio"], [role="button"], label, .menu_button, [class*="btn"], [class*="option"]';
    const isSelected = (el) => el.matches('.active, .selected, .is-active, .on, .checked, [aria-pressed="true"], [aria-selected="true"], [aria-checked="true"]') ||
        !!el.querySelector('input:checked');
    const markSegments = (root) => {
        root.querySelectorAll('.inline-drawer-content *:not([data-slk-seg])').forEach(box => {
            if (box.closest('#slk-extension-settings')) return; // Slack UI 자체 설정은 건드리지 않음
            const kids = [...box.children];
            // 모든 칸에 글자가 있어야 하고, 토글(체크박스) 줄은 제외
            if (kids.some(k => !(k.textContent || '').trim())) return;
            if (box.querySelector('input[type="checkbox"]')) return;
            if (kids.length < 2 || kids.length > 5) return;
            if (!kids.every(k => k.matches(OPT))) return;
            if (kids.some(k => /tab/i.test(String(k.className) + ' ' + (k.getAttribute('role') || '')))) return;
            if (kids.some(k => (k.textContent || '').trim().length > 24)) return;
            const hasRadio = kids.some(k => k.querySelector('input[type="radio"]'));
            if (!hasRadio && kids.filter(isSelected).length !== 1) return; // 일반 버튼 줄은 제외
            box.dataset.slkSeg = '1';
            box.classList.add('slk-seg');
            const sync = () => kids.forEach(k => k.classList.toggle('slk-seg-on', isSelected(k)));
            sync();
            new MutationObserver(sync).observe(box, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-selected', 'aria-checked'] });
            box.addEventListener('click', () => setTimeout(sync, 0));
            box.addEventListener('change', () => setTimeout(sync, 0));
        });
    };

    let t = null;
    const run = () => {
        t = null;
        if (!document.body?.classList.contains('slk-ui')) return;
        const root = document.querySelector(ROOT);
        if (!shown(root)) return;
        markSwitches(root);
        markSegments(root);
    };
    const schedule = () => { if (!t) t = setTimeout(run, 150); };
    const start = () => {
        new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        document.addEventListener('click', schedule, true);
        schedule();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.57 — 채팅 날짜를 26.11.11 형태로 (원래 글자는 그대로 두고 data-slk-date로 표시)
(function slkShortDates() {
    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (y, m, d) => `${String(y).slice(-2)}.${pad(m)}.${pad(d)}`;
    const parse = (t) => {
        if (!t) return null;
        let m = t.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
        if (m) return fmt(m[1], m[2], m[3]);
        m = t.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
        if (m) return fmt(m[1], m[2], m[3]);
        m = t.match(/([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
        if (m && MONTHS[m[1].toLowerCase()]) return fmt(m[3], MONTHS[m[1].toLowerCase()], m[2]);
        m = t.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?,?\s+(\d{4})/);
        if (m && MONTHS[m[2].toLowerCase()]) return fmt(m[3], MONTHS[m[2].toLowerCase()], m[1]);
        const d = new Date(t);
        if (!isNaN(d)) return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return null;
    };
    const run = () => {
        document.querySelectorAll('#chat .mes .timestamp').forEach(el => {
            const raw = (el.textContent || '').trim();
            if (el.dataset.slkRaw === raw) return;
            el.dataset.slkRaw = raw;
            const short = parse(raw);
            if (short) el.dataset.slkDate = short;
            else delete el.dataset.slkDate;
        });
    };
    let t = null;
    const schedule = () => { if (!t) t = setTimeout(() => { t = null; run(); }, 80); };
    const start = () => {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        run();
        new MutationObserver(schedule).observe(chat, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();


// v1.4.58 — 시작(로딩) 화면을 처음부터 슬랙 모양으로.
// 확장은 ST가 켜진 뒤에 불러와지므로, ST가 설정을 읽자마자 적용하는 '사용자 지정 CSS'에
// 표시된 블록 하나를 자동으로 넣어 둠 (다음 실행부터 적용). Slack UI를 끄면 자동으로 뺌.
(function slkBootSplashCss() {
    const START = '/* ==== Slack UI 시작 화면 (자동 추가 — 지우지 마세요) ==== */';
    const END = '/* ==== /Slack UI 시작 화면 ==== */';
    const BLOCK = START + '\n' + "@font-face { font-family: 'SlackBootLato'; font-style: normal; font-weight: 900; font-display: block; src: url(https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh50Xew8.ttf) format('truetype'); } @media screen and (max-width: 1000px) { #preloader { background: #4A154B !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo)) { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100dvh !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: #4A154B !important; box-shadow: none !important; outline: none !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo))::backdrop { background: #4A154B !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo)) :is(.popup-body, .popup-content) { width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important; box-shadow: none !important; overflow: hidden !important; } dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo)) .popup-controls { display: none !important; } #loader { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 28px !important; width: 100% !important; height: 100% !important; background: transparent !important; color: #FFFFFF !important; } #loader::before { content: 'Slack'; order: 1; margin: -10px 0 0; color: #FFFFFF; font-family: 'Lato', 'SlackBootLato', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; font-size: 22px; font-weight: 900; letter-spacing: -0.02em; } #loader .splash-logo { order: 0; width: 96px !important; height: 96px !important; object-fit: cover !important; border-radius: 24px !important; filter: none !important; box-shadow: 0 10px 30px rgba(0, 0, 0, .28) !important; } #loader #load-spinner, #preloader #load-spinner { order: 2; position: static !important; width: 28px !important; height: 28px !important; margin-top: 18px; font-size: 0 !important; color: transparent !important; border: 3px solid rgba(255, 255, 255, .25) !important; border-top-color: #FFFFFF !important; border-radius: 50% !important; box-sizing: border-box !important; animation: slk-boot-spin .8s linear infinite !important; } #loader #load-spinner::before { content: none !important; display: none !important; } #loader .splash-message { order: 3; margin: -12px 0 0 !important; color: rgba(255, 255, 255, .82) !important; font-family: 'Lato', 'SlackBootLato', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif !important; font-size: 15px !important; font-weight: 600 !important; text-shadow: none !important; } } @keyframes slk-boot-spin { to { transform: rotate(360deg); } } @media screen and (max-width: 1000px) { dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo)) * { border-color: transparent !important; } dialog:is(:has(#loader), :has(.splash-screen), :has(.splash-logo)) :is(.popup-body, .popup-content, #loader, .splash-screen) { background: transparent !important; border: 0 !important; box-shadow: none !important; outline: none !important; } }" + '\n' + END;
    const strip = (s) => {
        const i = s.indexOf(START), j = s.indexOf(END);
        if (i === -1 || j === -1) return s;
        return (s.slice(0, i).replace(/\n+$/, '') + '\n' + s.slice(j + END.length).replace(/^\n+/, '')).trim();
    };
    const sync = () => {
        const ctx = window.SillyTavern?.getContext?.();
        const pu = ctx?.powerUserSettings;
        if (!pu || typeof pu.custom_css !== 'string') return false;
        const current = pu.custom_css;
        const base = strip(current);
        const next = SLK_UI_SETTINGS.enabled ? (base ? base + '\n\n' : '') + BLOCK : base;
        if (next === current) return true;
        pu.custom_css = next;
        const ta = document.getElementById('customCSS');
        if (ta) ta.value = next;
        ctx.saveSettingsDebounced?.();
        return true;
    };
    const start = () => {
        let tries = 0;
        const tick = () => { if (!sync() && ++tries < 30) setTimeout(tick, 1000); };
        setTimeout(tick, 1500);
        // 테마를 바꾸면 사용자 지정 CSS가 통째로 바뀌므로 그때도 다시 넣음
        document.addEventListener('change', (e) => {
            if (e.target && (e.target.id === 'themes' || e.target.id === 'customCSS')) setTimeout(sync, 800);
        }, true);
        window.addEventListener('slk-ui-settings-changed', () => setTimeout(sync, 0));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.60 — 슬라이더 채움(파란 부분) 표시
(function slkRangeFill() {
    const update = (el) => {
        const min = parseFloat(el.min || '0'), max = parseFloat(el.max || '100'), v = parseFloat(el.value || '0');
        const pct = max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0;
        el.style.setProperty('--slk-fill', pct + '%');
    };
    const all = () => document.querySelectorAll('input[type="range"]').forEach(update);
    document.addEventListener('input', (e) => { if (e.target?.type === 'range') update(e.target); }, true);
    document.addEventListener('change', (e) => { if (e.target?.type === 'range') update(e.target); }, true);
    // ST가 코드로 값을 바꾸는 경우(프리셋 불러오기 등)도 반영
    const start = () => {
        all();
        setInterval(all, 1500);
        let t = null;
        new MutationObserver(() => { if (!t) t = setTimeout(() => { t = null; all(); }, 200); })
            .observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.61 — 확장이 메시지 이름 줄에 끼워 넣은 버튼을 ⋯ ✎ 버튼 묶음 안으로 옮김
// (따로 떨어져 이름과 겹치거나 혼자 동떨어지지 않게)
(function slkAdoptForeignMesButtons() {
    const KNOWN = '.name_text, .mes_ghost, .timestamp, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .mes_buttons, .mes_edit_buttons, .flex-container, .alignItemsBaseline';
    const AVATAR_KNOWN = '.avatar, .mesIDDisplay, .mes_timer, .tokenCounterDisplay';
    const adopt = (mes) => {
        const ch = mes.querySelector(':scope .ch_name');
        const box = ch?.querySelector(':scope > .mes_buttons');
        if (!ch || !box) return;
        // 프사 묶음 안에 확장이 넣은 버튼(↻ 등)도 버튼 묶음으로
        mes.querySelectorAll(':scope > .mesAvatarWrapper > *').forEach(el => {
            if (el.matches(AVATAR_KNOWN) || el.dataset.slkAdopted) return;
            el.dataset.slkAdopted = '1';
            el.classList.add('slk-adopted-btn');
            box.insertBefore(el, box.firstChild);
        });
        // .mes 바로 아래에 붙은 작은 버튼(아이콘만 있는 것)도
        mes.querySelectorAll(':scope > :is(.mes_button, [class*="fa-"], button)').forEach(el => {
            if (el.matches('.swipe_left, .swipeRightBlock, .del_checkbox, .for_checkbox') || el.dataset.slkAdopted) return;
            if ((el.textContent || '').trim().length > 2) return;
            el.dataset.slkAdopted = '1';
            el.classList.add('slk-adopted-btn');
            box.insertBefore(el, box.firstChild);
        });
        const cands = [
            ...ch.querySelectorAll(':scope > *'),
            ...ch.querySelectorAll(':scope > .flex-container > *'),
            ...ch.querySelectorAll(':scope .alignItemsBaseline > *'),
        ];
        cands.forEach(el => {
            if (el.matches(KNOWN) || el.closest('.mes_buttons, .mes_edit_buttons') !== null && el.closest('.mes_buttons, .mes_edit_buttons') !== el) return;
            if (el.matches(KNOWN)) return;
            if (el.dataset.slkAdopted) return;
            el.dataset.slkAdopted = '1';
            el.classList.add('slk-adopted-btn');
            box.insertBefore(el, box.firstChild);
        });
    };
    const run = () => {
        if (!document.body?.classList.contains('slk-ui')) return;
        document.querySelectorAll('#chat .mes').forEach(adopt);
    };
    let t = null;
    const schedule = () => { if (!t) t = setTimeout(() => { t = null; run(); }, 120); };
    const start = () => {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        run();
        new MutationObserver(schedule).observe(chat, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.63 — ⋯ 펼칠 때 확장 아이콘(↻ 등)이 어디에 붙어 있든 버튼 묶음 맨 앞으로 모음
(function slkGatherOnExpand() {
    const gather = (mes) => {
        const box = mes.querySelector('.ch_name > .mes_buttons');
        if (!box) return;
        const extra = box.querySelector('.extraMesButtons');
        // ch_name 안·프사 안·mes_block 바로 아래의 작은 아이콘 요소
        const pool = [
            ...mes.querySelectorAll(':scope > .mesAvatarWrapper > :not(.avatar):not(.mesIDDisplay):not(.mes_timer):not(.tokenCounterDisplay)'),
            ...mes.querySelectorAll(':scope .ch_name > :not(.mes_buttons):not(.mes_edit_buttons):not(.flex-container)'),
            ...mes.querySelectorAll(':scope .ch_name > .flex-container > :not(.alignItemsBaseline)'),
            ...mes.querySelectorAll(':scope .ch_name .alignItemsBaseline > :not(.name_text):not(.mes_ghost):not(.timestamp)'),
        ];
        pool.forEach(el => {
            // Metadata is not an action. Moving it to the icon toolbar creates
            // invisible 30px flex items when its visibility is hidden on expand.
            if (el.matches('.name_text, .timestamp, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .mes_ghost')) return;
            if (el.closest('.mes_buttons')) return;
            el.classList.add('slk-adopted-btn');
            el.dataset.slkAdopted = '1';
            box.insertBefore(el, extra || box.firstChild);
        });
    };
    document.addEventListener('click', (e) => {
        const hint = e.target.closest?.('#chat .extraMesButtonsHint');
        if (!hint) return;
        const mes = hint.closest('.mes');
        if (mes) { gather(mes); setTimeout(() => gather(mes), 50); setTimeout(() => gather(mes), 300); }
    }, true);
})();

// v1.4.69 — 열린 메시지 메뉴의 실제 버튼들을 한 컨테이너에 모으고,
// 닫을 때 원래 DOM 위치로 돌립니다. 버튼은 복제하지 않으므로 기존 이벤트가 유지됩니다.
(function slkCompactExpandedActions() {
    const movedByMessage = new WeakMap();

    function sync(mes) {
        const box = mes.querySelector('.ch_name > .mes_buttons');
        const extra = box?.querySelector(':scope > .extraMesButtons');
        if (!extra) return;
        // CSS의 display:contents (테마) 말고 SillyTavern이 실제로 설정한 인라인 상태를 사용.
        const open = extra.style.display !== '' && extra.style.display !== 'none';
        mes.classList.toggle('slk-mes-expanded', open);

        const previous = movedByMessage.get(mes);
        if (!open) {
            if (previous?.length) {
                // 마지막에 옮긴 요소부터 복원하면 기존 DOM 순서를 그대로 유지할 수 있습니다.
                for (const {el, parent, next} of [...previous].reverse()) {
                    if (!el.isConnected || !parent.isConnected) continue;
                    parent.insertBefore(el, next?.parentNode === parent ? next : null);
                }
            }
            movedByMessage.delete(mes);
            // 이전 버전에서 쓰던 클래스만 정리. 다른 UI/버튼은 변경하지 않음.
            box.querySelectorAll('.slk-flow-hidden, .slk-empty-action-slot, .slk-action-noicon')
                .forEach(el => el.classList.remove('slk-flow-hidden','slk-empty-action-slot','slk-action-noicon'));
            return;
        }

        const saved = previous || [];
        if (!previous) movedByMessage.set(mes, saved);
        // 타 확장이 나중에 추가한 아이콘도 기존 코드가 .mes_buttons로 채집합니다.
        // .extraMesButtonsHint는 실리태번의 접힘/펼침 트리거이므로 이동하지 않습니다.
        // extra는 원래 위치(메뉴 직접 자식)에 유지하고, 클릭 가능한 실물 버튼만 extra 안으로 이동.
        const direct = [...box.children].filter(el =>
            el !== extra && !el.classList.contains('extraMesButtonsHint') &&
            !el.matches('.name_text, .timestamp, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .mes_ghost')
        );
        // 닫힘 상태에서의 원래 부모·다음 형제를 기록합니다.
        // 나중에 추가된 버튼도 동일하게 관리합니다.
        const newRecords = direct.map(el => ({el, parent: box, next: el.nextSibling}));
        saved.push(...newRecords);
        const tail = [];
        for (const {el} of newRecords) {
            if (el.matches('.slk-adopted-btn, [data-slk-adopted]')) {
                extra.insertBefore(el, extra.firstChild);
            } else {
                tail.push(el);
            }
        }
        for (const el of tail) extra.appendChild(el);
        // 외부 확장이 만든 빈 래퍼에는 아이콘이 없어도 크기만 남을 수 있습니다.
        // 글자·SVG·이미지·실제 pseudo-icon이 없는 경우에만 빈 슬롯으로 처리합니다.
        const hasGlyph = (el) => {
            if ((el.textContent || '').trim()) return true;
            if (el.querySelector('svg, img, i, [class*="fa-"]')) return true;
            const style = getComputedStyle(el);
            if (style.backgroundImage !== 'none' || style.maskImage !== 'none' || style.webkitMaskImage !== 'none') return true;
            const before = getComputedStyle(el, '::before');
            const content = before.content || '';
            if (content !== 'none' && content !== 'normal' && content !== '""' && content !== "''" && content !== '') return true;
            return before.backgroundImage !== 'none' || before.maskImage !== 'none' || before.webkitMaskImage !== 'none';
        };
        for (const el of extra.children) {
            // Invisible (but laid-out) actions create empty 30px slots. Check
            // visibility as well as whether the element draws any icon.
            const computed = getComputedStyle(el);
            if (computed.visibility === 'hidden' || computed.opacity === '0') {
                el.classList.add('slk-flow-hidden');
            } else if (computed.display !== 'none') {
                el.classList.toggle('slk-action-noicon', !hasGlyph(el));
            }
        }
    }

    const run = () => {
        if (!document.body?.classList.contains('slk-ui')) return;
        if (!window.matchMedia('(max-width: 1000px)').matches) return;
        document.querySelectorAll('#chat .mes').forEach(sync);
    };
    let timer = null;
    const schedule = () => {
        if (timer !== null) return;
        timer = setTimeout(() => { timer = null; run(); }, 40);
    };
    document.addEventListener('click', e => {
        if (e.target.closest?.('#chat .extraMesButtonsHint, #chat .mes_buttons')) {
            setTimeout(run, 0);
            setTimeout(run, 90);
        }
    }, true);
    const start = () => {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        run();
        new MutationObserver(schedule).observe(chat, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['style','class'],
        });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
})();

// v1.4.64 — 확장이 직접 만든 팝업(고정 위치 창)을 찾아 slk-modal 클래스 부여 → 슬랙 팝업 디자인
(function slkForeignModals() {
    const OURS = '#slk-header, #slk-mobile-footer, #slk-settings-menu, #toast-container, #send_form, #form_sheld, .drawer-content, #top-bar, #top-settings-holder, #chat, #bg1, #bg_custom, #preloader, dialog.popup';
    const PRIMARY = /^(send|save|ok|confirm|apply|submit|generate|확인|저장|전송|적용|보내기|생성|예)$/i;
    const mark = () => {
        if (!document.body?.classList.contains('slk-ui')) return;
        const cands = document.querySelectorAll('body > *:not(script):not(style), dialog:not(.popup)');
        cands.forEach(el => {
            if (el.classList.contains('slk-modal') || el.matches(OURS) || el.closest(OURS)) return;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (!(cs.position === 'fixed' || el.tagName === 'DIALOG')) return;
            if (el.querySelector('#chat, #send_form, #slk-header, .drawer-content, #top-settings-holder')) return;
            if (el.tagName !== 'DIALOG' && (parseInt(cs.zIndex, 10) || 0) < 1000) return;
            const r = el.getBoundingClientRect();
            // 화면 전체를 덮는 반투명 배경이면, 그 안의 창을 찾음
            let win = el;
            if (r.width >= innerWidth - 2 && r.height >= innerHeight - 2) {
                win = [...el.querySelectorAll(':scope > *, :scope > * > *')].find(c => {
                    const rr = c.getBoundingClientRect();
                    return rr.width > innerWidth * 0.6 && rr.height > 120 && rr.height < innerHeight && c.querySelector('button, textarea, input, .menu_button');
                });
                if (!win) return;
                el.classList.add('slk-modal-backdrop');
            } else if (!(r.width > innerWidth * 0.6 && r.height > 120 && el.querySelector('button, textarea, input, .menu_button'))) {
                return;
            }
            win.classList.add('slk-modal');
            win.querySelectorAll('button, .menu_button, [role="button"]').forEach(b => {
                const label = (b.textContent || '').trim();
                if (PRIMARY.test(label)) b.classList.add('slk-modal-primary');
                if ((!label || /^[✕×xX✖]$/.test(label)) && (!label ? /close|xmark|times/i.test(b.className + ' ' + (b.innerHTML || '')) : true)) b.classList.add('slk-modal-close');
            });
        });
    };
    let t = null;
    const start = () => {
        new MutationObserver(() => { if (!t) t = setTimeout(() => { t = null; mark(); }, 120); })
            .observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['style', 'class', 'open'] });
        mark();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.65 — 진단: Slack UI 설정에 버전 표시 + '진단 정보 복사' 버튼
(function slkDiagnostics() {
    const VERSION = '1.4.65';
    const add = () => {
        const content = document.getElementById('slk-extension-settings-content');
        if (!content || document.getElementById('slk-diag-row')) return !!content;
        const row = document.createElement('div');
        row.className = 'slk-settings-row';
        row.id = 'slk-diag-row';
        const cssVer = getComputedStyle(document.documentElement).getPropertyValue('--slk-css-version').trim().replace(/['"]/g, '') || '?';
        row.innerHTML = `<span style="font-size:13px;color:#8A8A8A">버전 JS ${VERSION} · CSS ${cssVer}</span><button type="button" class="menu_button" id="slk-diag-copy" style="margin-left:auto">진단 정보 복사</button>`;
        content.appendChild(row);
        row.querySelector('#slk-diag-copy').addEventListener('click', async () => {
            const out = [`JS ${VERSION} / CSS ${cssVer} / UA ${navigator.userAgent}`];
            const mes = [...document.querySelectorAll('#chat .mes')].reverse().find(m => m.querySelector('.extraMesButtons')) || null;
            if (mes) {
                const clone = mes.cloneNode(true);
                clone.querySelectorAll('.mes_text, .mes_reasoning_details, .mes_media_wrapper, .mes_file_wrapper').forEach(e => e.remove());
                out.push('--- MES ---', clone.outerHTML.slice(0, 6000));
            }
            const h = [...document.querySelectorAll('#AdvancedFormatting h4, #AdvancedFormatting h3')].find(e => /컨텍스트 서식|Context Formatting/i.test(e.textContent));
            if (h) {
                const chain = [];
                let el = h;
                for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
                    const cs = getComputedStyle(el);
                    chain.push(`${el.tagName}#${el.id}.${[...el.classList].join('.')} border:${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor} radius:${cs.borderTopLeftRadius} shadow:${cs.boxShadow.slice(0, 60)}`);
                }
                const prev = h.parentElement?.previousElementSibling;
                out.push('--- AF ---', ...chain, 'prev: ' + (prev ? prev.outerHTML.slice(0, 600) : '-'));
            }
            const text = out.join('\n');
            try { await navigator.clipboard.writeText(text); window.toastr?.success('복사됐어요. 대화창에 붙여넣어 주세요.'); }
            catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); window.toastr?.success('복사됐어요.'); }
        });
        return true;
    };
    const tick = () => { if (!add()) setTimeout(tick, 1000); };
    tick();
})();


// v1.4.80 — Keep the original swipe controls in ONE parent, avoiding
// competing absolute/grid positioning of .swipe_left versus .swipeRightBlock.
// The original elements are moved, NOT cloned; SillyTavern handlers survive.
(function slkGroupNativeSwipeControls() {
    const isEnabled = () => document.body.classList.contains('slk-ui') &&
        window.matchMedia('(max-width: 1000px)').matches;

    const sync = () => {
        const enabled = isEnabled();
        document.querySelectorAll('#chat .mes').forEach(mes => {
            const mesBlock = mes.querySelector(':scope > .mes_block');
            const holder = mes.querySelector(':scope > .swipeRightBlock');
            if (!mesBlock || !holder) return;
            const left = mes.querySelector(':scope > .swipe_left') ||
                holder.querySelector(':scope > .swipe_left');
            const counter = holder.querySelector(':scope > .swipes-counter');
            const right = holder.querySelector(':scope > .swipe_right');
            if (!left || !counter || !right) return;

            if (enabled) {
                // Three original nodes in a stable, direct flex row.
                if (holder.firstElementChild !== left) holder.insertBefore(left, holder.firstElementChild);
                if (left.nextElementSibling !== counter) holder.insertBefore(counter, left.nextSibling);
                if (counter.nextElementSibling !== right) holder.insertBefore(right, counter.nextSibling);
                if (!holder.classList.contains('slk-swipe-inline')) holder.classList.add('slk-swipe-inline');
            } else if (holder.classList.contains('slk-swipe-inline')) {
                // Restore native structure when Slack UI is disabled or on desktop.
                mes.insertBefore(left, mesBlock);
                if (right.nextElementSibling !== counter) holder.insertBefore(right, counter);
                holder.classList.remove('slk-swipe-inline');
            }
        });
    };

    let timer = null;
    const schedule = () => {
        if (timer !== null) return;
        timer = setTimeout(() => { timer = null; sync(); }, 50);
    };
    const start = () => {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        sync();
        new MutationObserver(schedule).observe(chat, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['class'],
        });
        window.addEventListener('slk-ui-settings-changed', schedule);
        window.addEventListener('resize', schedule);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

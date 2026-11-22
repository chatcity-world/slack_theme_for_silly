// Slack UI for SillyTavern — v0.9.2 (mobile light: header + bottom tab bar)

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


// 화면 하단용 독립 내비게이션. 기존 ST 드로어 DOM은 이동/삭제하지 않음.
function buildMobileFooter() {
    if (document.getElementById('slk-mobile-footer')) return;
    const footer = document.createElement('nav');
    footer.id = 'slk-mobile-footer';
    footer.setAttribute('aria-label', '모바일 설정 탭');

    TABS.forEach(([selector, iconKey, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'slk-footer-tab';
        button.setAttribute('aria-label', label);
        button.title = label;
        button.dataset.drawerSelector = selector;
        button.innerHTML = ICONS[iconKey];
        button.addEventListener('click', () => {
            openDrawer(selector); // 원래 SillyTavern 패널 토글 그대로 사용
            queueMicrotask(syncMobileFooter);
        });
        footer.appendChild(button);
    });

    document.body.appendChild(footer);
    document.body.classList.add('slk-footer-ready');
    syncMobileFooter();

    // 원본 드로어를 열거나 닫으면 하단 아이콘 활성 상태만 동기화.
    const observer = new MutationObserver(syncMobileFooter);
    for (const [selector] of TABS) {
        const original = document.querySelector(`${selector} > .drawer-toggle`);
        if (original) observer.observe(original, { attributes: true, subtree: true, attributeFilter: ['class'] });
        const panel = document.querySelector(`${selector} > .drawer-content`);
        if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    }
}

function syncMobileFooter() {
    const footer = document.getElementById('slk-mobile-footer');
    if (!footer) return;
    for (const button of footer.querySelectorAll('.slk-footer-tab')) {
        const drawer = document.querySelector(button.dataset.drawerSelector);
        const active = !!drawer?.querySelector('.drawer-icon.openIcon, .drawer-content.openDrawer');
        button.classList.toggle('slk-footer-active', active);
        button.setAttribute('aria-pressed', String(active));
    }
}

function openDrawer(selector) {
    const toggle = document.querySelector(`${selector} .drawer-toggle`);
    if (!toggle) return;
    // ST는 jQuery로 클릭 핸들러를 걸기 때문에 jQuery가 있으면 그걸로 트리거
    if (window.jQuery) window.jQuery(toggle).trigger('click');
    else toggle.click();
}

function buildHeader() {
    if (document.getElementById('slk-header')) return;

    const header = document.createElement('div');
    header.id = 'slk-header';
    header.innerHTML = `
        <button id="slk-ws" type="button" title="캐릭터 목록">
            <span class="slk-ws-avatar has-img"><img src="img/logo.png" alt="" onerror="this.parentElement.classList.remove('has-img')" /><span class="slk-ws-initial">S</span></span>
            <span class="slk-ws-text">
                <span class="slk-ws-name">SillyTavern</span>
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
    SLK.header = header;
    SLK.menu = menu;

    header.querySelector('#slk-ws').addEventListener('click', () => {
        closeMenu();
        openDrawer(DRAWERS.character);
    });

    header.querySelector('#slk-settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
    });

    menu.querySelectorAll('.slk-menu-item').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            openDrawer(DRAWERS[btn.dataset.target]);
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
    const sync = () => {
        const open = document.activeElement === ta || ta.value.trim() !== '';
        form.classList.toggle('slk-compose-open', open);
        document.body.classList.toggle('slk-composing', open);
    };
    ta.addEventListener('focus', sync);
    ta.addEventListener('blur', () => setTimeout(sync, 0));
    ta.addEventListener('input', sync);
    form.addEventListener('mousedown', (e) => {
        if (document.activeElement === ta && !e.target.closest('#send_textarea')) e.preventDefault();
    });
    form.addEventListener('click', () => setTimeout(sync, 0));
    sync();
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
        if (typeof DRAWERS !== 'undefined' && DRAWERS.character) openDrawer(DRAWERS.character);
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
// 사용자 설정 · 배경이 열려 있으면 헤더 왼쪽에 ‹ 뒤로 (패널 닫기)
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
    btn.addEventListener('click', () => {
        ['userSettings', 'backgrounds'].forEach((k) => {
            if (document.querySelector(`${DRAWERS[k]} .drawer-icon.openIcon`)) openDrawer(DRAWERS[k]);
        });
        setTimeout(() => { if (typeof recomputeHeaderCompact === 'function') recomputeHeaderCompact(); }, 80);
    });
}

function init() {
    document.body.classList.add('slk-ui');
    preventInputZoom();
    relabelPersonaButtons();
    setTimeout(relabelPersonaButtons, 1500);
    buildHeader();
    buildPanelBack();
    buildTabIcons();
    buildMobileFooter();
    buildAiTabs();
    buildUsTabs();
    watchWorldInfo();
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

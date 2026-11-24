// Slack UI for SillyTavern — v0.9.2 (mobile light: header + bottom tab bar)

// Settings are kept independently of SillyTavern's extension loader state.
const SLK_DEFAULT_HEADER_IMAGE = 'img/logo.png';
const SLK_SLACK_HEADER_IMAGE = new URL('./slack-logo.webp', import.meta.url).href;
const SLK_SPLASH_IMAGE = new URL('./slack-splash-logo.png', import.meta.url).href;
const SLK_UI_SETTINGS = (() => {
    const read = (key, fallback) => {
        try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    };
    const clamp = (value, fallback, min, max) => {
        const n = Number(value);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const color = read('slk-ui-dialogue-color', '').trim();
    const readInk = (key) => {
        const candidate = read(key, '').trim();
        return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : '';
    };
    const headerImageMode = read('slk-ui-header-image-mode', 'slack');
    return {
        enabled: read('slk-ui-enabled', 'true') !== 'false',
        fontSize: Math.round(clamp(read('slk-ui-font-size', '15'), 15, 11, 26)),
        lineHeight: Math.round(clamp(read('slk-ui-line-height', '1.6'), 1.6, 1.2, 2.4) * 10) / 10,
        letterSpacing: Math.round(clamp(read('slk-ui-letter-spacing', '0'), 0, -1.5, 3) * 10) / 10,
        dialogueColor: /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : '',
        narrationInk: readInk('slk-ui-ink-narration'),
        dialogueInk: readInk('slk-ui-ink-dialogue'),
        asciiInk: readInk('slk-ui-ink-ascii') || '#999999',
        codeInk: readInk('slk-ui-ink-code'),
        headerImageMode: headerImageMode === 'custom' ? 'custom' : 'slack',
    };
})();
try { localStorage.removeItem('slk-ui-theme'); } catch { /* old option may not exist */ }

function slkSavePreference(key, value) {
    try { localStorage.setItem(key, String(value)); return true; }
    catch { window.toastr?.error('설정 저장 공간이 부족합니다. 이미지 용량을 확인해 주세요.'); return false; }
}

function slkSelectedLogoUrl() {
    return SLK_UI_SETTINGS.headerImageMode === 'custom'
        ? SLK_DEFAULT_HEADER_IMAGE
        : SLK_SLACK_HEADER_IMAGE;
}

function slkSelectedSplashLogoUrl() {
    // The extension setting controls both the header image and ST loading logo.
    // Slack keeps its clean transparent splash glyph; the registered image uses
    // the same SillyTavern logo URL that is used in the header.
    return SLK_UI_SETTINGS.headerImageMode === 'custom'
        ? SLK_DEFAULT_HEADER_IMAGE
        : SLK_SPLASH_IMAGE;
}


function slkRememberSplashLogo(src) {
    const cssUrl = `url(${JSON.stringify(src)})`;
    try {
        // Live loaders use --slk-loader-icon; older CSS uses --slk-splash-logo-url.
        // Update both immediately when the extension radio option changes.
        document.documentElement.style.setProperty('--slk-loader-icon', cssUrl, 'important');
        document.documentElement.style.setProperty('--slk-splash-logo-url', cssUrl);
        document.body?.style?.setProperty('--slk-loader-icon', cssUrl, 'important');
        document.body?.style?.setProperty('--slk-splash-logo-url', cssUrl);
    } catch { /* noop */ }
}

function slkApplyHeaderImage() {
    const src = slkSelectedLogoUrl();
    slkRememberSplashLogo(slkSelectedSplashLogoUrl());
    const avatar = document.querySelector('#slk-header .slk-ws-avatar');
    const image = avatar?.querySelector('img');
    if (image) {
        if (image.getAttribute('src') !== src) image.src = src;
        avatar.classList.add('has-img');
    }
    // Also update a currently visible splash and create a visible logo when ST
    // renders a splash container before our preferred logo node exists.
}

function applySlackUiSettings() {
    document.body.classList.toggle('slk-ui', SLK_UI_SETTINGS.enabled);
    document.body.classList.remove('slk-dark'); // Remove any older saved dark-mode class.
    document.body.style.setProperty('--slk-chat-font-size', `${SLK_UI_SETTINGS.fontSize}px`);
    document.body.style.setProperty('--slk-chat-line-height', String(SLK_UI_SETTINGS.lineHeight));
    document.body.style.setProperty('--slk-chat-letter-spacing-adjust', `${SLK_UI_SETTINGS.letterSpacing}px`);
    document.body.classList.toggle('slk-dialogue-custom', Boolean(SLK_UI_SETTINGS.dialogueColor));
    if (SLK_UI_SETTINGS.dialogueColor) document.body.style.setProperty('--slk-dialogue-bg', SLK_UI_SETTINGS.dialogueColor);
    else document.body.style.removeProperty('--slk-dialogue-bg');
    // The three ink colors are independent. Empty values keep the native theme colors.
    for (const [pref, slug] of [['narrationInk', 'narration'], ['dialogueInk', 'dialogue'], ['asciiInk', 'ascii'], ['codeInk', 'code']]) {
        const color = SLK_UI_SETTINGS[pref];
        document.body.classList.toggle(`slk-ink-${slug}`, Boolean(color));
        if (color) document.body.style.setProperty(`--slk-ink-${slug}`, color);
        else document.body.style.removeProperty(`--slk-ink-${slug}`);
    }
    slkApplyHeaderImage();
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
                <section class="slk-preference-section" aria-label="채팅 글자 설정">
                    <div class="slk-preference-heading">채팅 텍스트</div>
                    <div class="slk-settings-row">
                        <label for="slk-font-value">폰트 크기</label>
                        <div class="slk-preference-controls">
                            <div class="slk-stepper" data-pref="fontSize" data-min="11" data-max="26" data-step="1">
                                <button type="button" data-direction="-1" aria-label="폰트 크기 줄이기">−</button>
                                <output id="slk-font-value">15px</output>
                                <button type="button" data-direction="1" aria-label="폰트 크기 키우기">+</button>
                            </div>
                            <button type="button" id="slk-font-reset" class="slk-preference-button slk-pref-reset" aria-label="폰트 크기 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-settings-row">
                        <label for="slk-line-height-value">줄간격</label>
                        <div class="slk-preference-controls">
                            <div class="slk-stepper" data-pref="lineHeight" data-min="1.2" data-max="2.4" data-step="0.1">
                                <button type="button" data-direction="-1" aria-label="줄간격 줄이기">−</button>
                                <output id="slk-line-height-value">1.6</output>
                                <button type="button" data-direction="1" aria-label="줄간격 늘리기">+</button>
                            </div>
                            <button type="button" id="slk-line-height-reset" class="slk-preference-button slk-pref-reset" aria-label="줄간격 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-settings-row">
                        <label for="slk-letter-spacing-value">자간</label>
                        <div class="slk-preference-controls">
                            <div class="slk-stepper" data-pref="letterSpacing" data-min="-1.5" data-max="3" data-step="0.1">
                                <button type="button" data-direction="-1" aria-label="자간 좁히기">−</button>
                                <output id="slk-letter-spacing-value">0.0px</output>
                                <button type="button" data-direction="1" aria-label="자간 넓히기">+</button>
                            </div>
                            <button type="button" id="slk-letter-spacing-reset" class="slk-preference-button slk-pref-reset" aria-label="자간 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-preference-hint">자간 0.0px는 기존 디자인의 자간을 유지합니다.</div>
                </section>
                <section class="slk-preference-section" aria-label="대사 배경색 설정">
                    <div class="slk-preference-heading">대사 배경색</div>
                    <div class="slk-color-row">
                        <input type="color" id="slk-dialogue-color-picker" value="#efefef" aria-label="대사 배경색 선택">
                        <label class="slk-visually-hidden" for="slk-dialogue-hex">HEX 색상</label>
                        <input type="text" id="slk-dialogue-hex" maxlength="7" placeholder="#EFEFEF" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" inputmode="text" aria-label="대사 배경색 HEX">
                        <button type="button" id="slk-dialogue-reset" class="slk-preference-button" aria-label="대사 배경색 초기화">초기화</button>
                    </div>
                    <div class="slk-preference-hint">기본값은 현재 테마의 대사 배경색입니다.</div>
                </section>
                <section class="slk-preference-section" aria-label="채팅 글자색 설정">
                    <div class="slk-preference-heading">폰트 컬러</div>
                    <div class="slk-preference-hint">지정하지 않으면 테마의 기존 색상을 유지합니다.</div>
                    <div class="slk-ink-setting" data-ink="narration" data-pref="narrationInk" data-storage="slk-ui-ink-narration">
                        <label for="slk-ink-narration-hex">나레이션</label>
                        <div class="slk-color-row">
                            <input type="color" id="slk-ink-narration-picker" aria-label="나레이션 글자색 선택">
                            <input type="text" id="slk-ink-narration-hex" maxlength="7" placeholder="기본 색상" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" inputmode="text" aria-label="나레이션 글자색 HEX">
                            <button type="button" class="slk-preference-button slk-ink-reset" aria-label="나레이션 글자색 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-ink-setting" data-ink="dialogue" data-pref="dialogueInk" data-storage="slk-ui-ink-dialogue">
                        <label for="slk-ink-dialogue-hex">대사</label>
                        <div class="slk-color-row">
                            <input type="color" id="slk-ink-dialogue-picker" aria-label="대사 글자색 선택">
                            <input type="text" id="slk-ink-dialogue-hex" maxlength="7" placeholder="기본 색상" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" inputmode="text" aria-label="대사 글자색 HEX">
                            <button type="button" class="slk-preference-button slk-ink-reset" aria-label="대사 글자색 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-ink-setting" data-ink="ascii" data-pref="asciiInk" data-storage="slk-ui-ink-ascii">
                        <label for="slk-ink-ascii-hex">아스키아트 (*텍스트*)</label>
                        <div class="slk-color-row">
                            <input type="color" id="slk-ink-ascii-picker" aria-label="아스키아트 글자색 선택">
                            <input type="text" id="slk-ink-ascii-hex" maxlength="7" placeholder="기본 색상" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" inputmode="text" aria-label="아스키아트 글자색 HEX">
                            <button type="button" class="slk-preference-button slk-ink-reset" aria-label="아스키아트 글자색 초기화">초기화</button>
                        </div>
                    </div>
                    <div class="slk-ink-setting" data-ink="code" data-pref="codeInk" data-storage="slk-ui-ink-code">
                        <label for="slk-ink-code-hex">코드박스</label>
                        <div class="slk-color-row">
                            <input type="color" id="slk-ink-code-picker" aria-label="코드박스 글자색 선택">
                            <input type="text" id="slk-ink-code-hex" maxlength="7" placeholder="기본 색상" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" inputmode="text" aria-label="코드박스 글자색 HEX">
                            <button type="button" class="slk-preference-button slk-ink-reset" aria-label="코드박스 글자색 초기화">초기화</button>
                        </div>
                    </div>
                </section>
                <section class="slk-preference-section" aria-label="시작화면 / 헤더 이미지 설정">
                    <div class="slk-preference-heading">시작화면 / 헤더 이미지</div>
                    <div class="slk-header-image-options" role="radiogroup" aria-label="시작화면 / 헤더 이미지 종류">
                        <label><input type="radio" name="slk-header-image-mode" value="slack"><span>Slack</span></label>
                        <label><input type="radio" name="slk-header-image-mode" value="custom"><span>등록한 이미지</span></label>
                    </div>
                </section>
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
        const next = enabledInput.checked;
        // Loading a pristine native SillyTavern tree is safer than trying to
        // reverse dozens of Slack DOM transformations within the same page.
        try { localStorage.setItem('slk-ui-enabled', String(next)); }
        catch { enabledInput.checked = SLK_UI_SETTINGS.enabled; return; }
        SLK_UI_SETTINGS.enabled = next;
        window.location.reload(); // exactly once, only on explicit switch action
    });

    // Steppers update the actual chat text, not the settings panel itself.
    const prefStorageKeys = { fontSize: 'slk-ui-font-size', lineHeight: 'slk-ui-line-height', letterSpacing: 'slk-ui-letter-spacing' };
    const prefDefaults = { fontSize: 15, lineHeight: 1.6, letterSpacing: 0 };
    container.querySelectorAll('.slk-stepper').forEach(stepper => {
        const pref = stepper.dataset.pref;
        const output = stepper.querySelector('output');
        const min = Number(stepper.dataset.min);
        const max = Number(stepper.dataset.max);
        const step = Number(stepper.dataset.step);
        const draw = () => {
            output.textContent = pref === 'fontSize' ? `${SLK_UI_SETTINGS[pref]}px`
                : pref === 'letterSpacing' ? `${SLK_UI_SETTINGS[pref].toFixed(1)}px`
                : SLK_UI_SETTINGS[pref].toFixed(1);
            stepper.querySelector('[data-direction="-1"]').disabled = SLK_UI_SETTINGS[pref] <= min;
            stepper.querySelector('[data-direction="1"]').disabled = SLK_UI_SETTINGS[pref] >= max;
        };
        stepper.querySelectorAll('button[data-direction]').forEach(button => {
            button.addEventListener('click', () => {
                const next = Math.round(Math.max(min, Math.min(max,
                    SLK_UI_SETTINGS[pref] + Number(button.dataset.direction) * step)) * 10) / 10;
                SLK_UI_SETTINGS[pref] = next;
                slkSavePreference(prefStorageKeys[pref], next);
                draw();
                applySlackUiSettings();
            });
        });
        // Restore only this preference; keep the other text and color settings unchanged.
        stepper.closest('.slk-preference-controls').querySelector('.slk-pref-reset').addEventListener('click', () => {
            SLK_UI_SETTINGS[pref] = prefDefaults[pref];
            slkSavePreference(prefStorageKeys[pref], prefDefaults[pref]);
            draw();
            applySlackUiSettings();
        });
        draw();
    });

    const colorPicker = container.querySelector('#slk-dialogue-color-picker');
    const colorHex = container.querySelector('#slk-dialogue-hex');
    const normalizeHex = value => {
        const raw = String(value).trim();
        if (/^#[0-9a-f]{3}$/i.test(raw)) return '#' + [...raw.slice(1)].map(d => d + d).join('').toUpperCase();
        return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : null;
    };
    const syncColorFields = () => {
        colorPicker.value = SLK_UI_SETTINGS.dialogueColor || '#efefef';
        colorHex.value = SLK_UI_SETTINGS.dialogueColor || '';
        colorHex.classList.remove('slk-input-invalid');
        colorHex.removeAttribute('aria-invalid');
    };
    const setDialogueColor = value => {
        SLK_UI_SETTINGS.dialogueColor = value;
        slkSavePreference('slk-ui-dialogue-color', value);
        syncColorFields();
        applySlackUiSettings();
    };
    colorPicker.addEventListener('input', () => setDialogueColor(colorPicker.value.toUpperCase()));
    // Never apply, normalize, or validate while the user is typing.
    // Commit only after the input loses focus (e.g. dismissing the iOS keyboard).
    colorHex.addEventListener('input', () => {
        colorHex.classList.remove('slk-input-invalid');
        colorHex.removeAttribute('aria-invalid');
    });
    colorHex.addEventListener('blur', () => {
        const raw = colorHex.value.trim();
        if (!raw) { setDialogueColor(''); return; }
        const normalized = normalizeHex(raw);
        if (normalized) { setDialogueColor(normalized); return; }
        // Leave invalid text intact so it can be corrected on the next focus.
        colorHex.classList.add('slk-input-invalid');
        colorHex.setAttribute('aria-invalid', 'true');
    });
    colorHex.addEventListener('keydown', event => {
        if (event.key === 'Enter') colorHex.blur();
    });
    container.querySelector('#slk-dialogue-reset').addEventListener('click', () => setDialogueColor(''));
    syncColorFields();

    // Independent narration / dialogue / asterisk emphasis / code block ink controls.
    const inkDefaults = { narration: '#1D1C1D', dialogue: '#1D1C1D', ascii: '#999999', code: '#1D1C1D' };
    const inkRows = [...container.querySelectorAll('.slk-ink-setting')];
    const drawInkFields = (row) => {
        const pref = row.dataset.pref;
        const picker = row.querySelector('input[type="color"]');
        const hex = row.querySelector('input[type="text"]');
        picker.value = SLK_UI_SETTINGS[pref] || inkDefaults[row.dataset.ink];
        hex.value = SLK_UI_SETTINGS[pref] || '';
        hex.classList.remove('slk-input-invalid');
        hex.removeAttribute('aria-invalid');
    };
    inkRows.forEach(row => {
        const pref = row.dataset.pref;
        const picker = row.querySelector('input[type="color"]');
        const hex = row.querySelector('input[type="text"]');
        const setInk = value => {
            SLK_UI_SETTINGS[pref] = value;
            slkSavePreference(row.dataset.storage, value);
            drawInkFields(row);
            applySlackUiSettings();
        };
        picker.addEventListener('input', () => setInk(picker.value.toUpperCase()));
        // Preserve the exact typed text while the keyboard is open.
        // Validate and apply only after editing is finished.
        hex.addEventListener('input', () => {
            hex.classList.remove('slk-input-invalid');
            hex.removeAttribute('aria-invalid');
        });
        hex.addEventListener('blur', () => {
            const raw = hex.value.trim();
            if (!raw) { setInk(row.dataset.ink === 'ascii' ? '#999999' : ''); return; }
            const normalized = normalizeHex(raw);
            if (normalized) { setInk(normalized); return; }
            // Do not discard the invalid text or modify the last valid color.
            hex.classList.add('slk-input-invalid');
            hex.setAttribute('aria-invalid', 'true');
        });
        hex.addEventListener('keydown', event => {
            if (event.key === 'Enter') hex.blur();
        });
        row.querySelector('.slk-ink-reset').addEventListener('click', () =>
            setInk(row.dataset.ink === 'ascii' ? '#999999' : ''));
        drawInkFields(row);
    });
    // The registered image is SillyTavern's own logo, already replaced by the user.
    // Never store or require a separate Slack UI upload.
    const modes = container.querySelectorAll('input[name="slk-header-image-mode"]');
    const syncAvatarFields = () => {
        modes.forEach(radio => { radio.checked = radio.value === SLK_UI_SETTINGS.headerImageMode; });
    };
    modes.forEach(radio => radio.addEventListener('change', () => {
        if (!radio.checked) return;
        SLK_UI_SETTINGS.headerImageMode = radio.value;
        slkSavePreference('slk-ui-header-image-mode', radio.value);
        syncAvatarFields();
        applySlackUiSettings(); // refresh header, visible splash, and saved next-launch splash CSS
    }));
    syncAvatarFields();
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

// Active-only navigation glyphs. Negative-space details remain transparent on
// both the purple mobile selection pill and the desktop sidebar.
const slkSolidNavSvg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="none" aria-hidden="true">${body}</svg>`;
const SLK_ACTIVE_NAV_ICONS = {
    prompt: slkSolidNavSvg('<path fill-rule="evenodd" d="M6 3h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm1.1 5.5L5.9 10l2.5 2-2.5 2 1.2 1.5 4.3-3.5-4.3-3.5ZM12 14v2h5v-2h-5Z"/>'),
    connection: slkSolidNavSvg('<path d="M8 2a1 1 0 0 1 2 0v5h4V2a1 1 0 0 1 2 0v5h2a1 1 0 0 1 1 1v4a6 6 0 0 1-6 6v4a1 1 0 0 1-2 0v-4a6 6 0 0 1-6-6V8a1 1 0 0 1 1-1h2Z"/>'),
    formatting: ICONS.formatting.replace('<path', '<g stroke-width="2.7"><path').replace('</svg>', '</g></svg>'),
    lorebook: slkSolidNavSvg('<path d="M2 3h6a4.8 4.8 0 0 1 3.25 1.3v16A4.9 4.9 0 0 0 8 19H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM22 3h-6a4.8 4.8 0 0 0-3.25 1.3v16A4.9 4.9 0 0 1 16 19h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z"/>'),
    extensions: slkSolidNavSvg('<path d="M10 3.5a2 2 0 1 1 4 0V5h3a2 2 0 0 1 2 2v3h-1.5a2 2 0 1 0 0 4H19v3a2 2 0 0 1-2 2h-3v-1.5a2 2 0 1 0-4 0V19H7a2 2 0 0 1-2-2v-3h1.5a2 2 0 1 0 0-4H5V7a2 2 0 0 1 2-2h3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
    persona: slkSolidNavSvg('<path fill-rule="evenodd" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm0 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5.9 17.8a8.5 8.5 0 0 0 12.2 0 6.8 6.8 0 0 0-12.2 0Z"/>'),
    character: slkSolidNavSvg('<circle cx="9" cy="8" r="4"/><path d="M1.5 20v-1a5.5 5.5 0 0 1 5.5-5.5h4A5.5 5.5 0 0 1 16.5 19v1a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1ZM15.3 4.1a4 4 0 1 1 0 7.8 6 6 0 0 0 0-7.8ZM17 13.7a5.5 5.5 0 0 1 5.5 5.3v1a1 1 0 0 1-1 1h-3.1a3 3 0 0 0 .1-1v-1a7.5 7.5 0 0 0-1.5-5.3Z"/>'),
};
function slkSyncNavGlyph(button, active, host = button) {
    const key = TABS.find(([selector]) => selector === button.dataset.drawer)?.[1];
    if (!key || !SLK_ACTIVE_NAV_ICONS[key] || !host) return;
    const state = active ? 'solid' : 'line';
    if ((host.dataset.slkGlyphState || 'line') === state) return;
    host.innerHTML = active ? SLK_ACTIVE_NAV_ICONS[key] : ICONS[key];
    host.dataset.slkGlyphState = state;
}

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
    if (SLK_UI_SETTINGS.enabled && window.matchMedia('(min-width: 1001px)').matches && window.__slkDesktopRailNavigation) {
        window.__slkDesktopRailNavigation.toggle(selector);
    } else if (SLK_UI_SETTINGS.enabled && window.matchMedia('(max-width: 1000px)').matches && window.__slkPanelNavigation) {
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
            <span class="slk-ws-avatar has-img"><img src="${SLK_UI_SETTINGS.headerImageMode === 'custom' ? SLK_DEFAULT_HEADER_IMAGE : SLK_SLACK_HEADER_IMAGE}" alt="" onerror="this.parentElement.classList.remove('has-img')" /><span class="slk-ws-initial">S</span></span>
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
    slkApplyHeaderImage();

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

    // The native configuration column can have horizontal padding. Align the
    // four equal tabs with the FULL panel width, not with that padded column.
    const alignTabsToPanel = () => {
        const panel = document.getElementById('left-nav-panel');
        if (!panel || !bar.isConnected) return;
        const panelRect = panel.getBoundingClientRect();
        const parentRect = bar.parentElement.getBoundingClientRect();
        if (panelRect.width < 1 || parentRect.width < 1) return;
        // The parent's bounding rect includes its own padding. The tabs
        // start at its CONTENT left edge, which can be 16px further in.
        const parentStyle = getComputedStyle(bar.parentElement);
        const contentLeft = parentRect.left +
            (parseFloat(parentStyle.borderLeftWidth) || 0) +
            (parseFloat(parentStyle.paddingLeft) || 0);
        const width = `${Math.round(panelRect.width * 100) / 100}px`;
        const offset = `${Math.round((panelRect.left - contentLeft) * 100) / 100}px`;
        if (bar.style.getPropertyValue('--slk-ai-tabs-width') !== width) bar.style.setProperty('--slk-ai-tabs-width', width);
        if (bar.style.getPropertyValue('--slk-ai-tabs-offset') !== offset) bar.style.setProperty('--slk-ai-tabs-offset', offset);
    };
    alignTabsToPanel();
    requestAnimationFrame(alignTabsToPanel);
    window.addEventListener('resize', alignTabsToPanel);
    if ('ResizeObserver' in window) new ResizeObserver(alignTabsToPanel).observe(document.getElementById('left-nav-panel'));

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.slk-aitab');
        if (!btn) return;
        setAiTab(btn.dataset.tab);
        const scroller = bar.closest('.scrollableInner');
        if (window.matchMedia('(min-width: 1001px)').matches && scroller && scroller.scrollTop > bar.offsetTop) scroller.scrollTop = bar.offsetTop;
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

    const mq = window.matchMedia('(min-width: 0px)');
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
        // PC: 슬랙 데스크톱처럼 입력창은 항상 펼친 모양(입력칸 + 아래 도구 줄)
        const pc = window.matchMedia('(min-width: 1001px)').matches && SLK_UI_SETTINGS.enabled;
        const open = pc || (focused && !keyboardDismissed && (keyboardVisible || pendingFocus));
        const content = ta.value;
        const firstLine = content.split(/\r\n|\n|\r/, 1)[0];
        preview.textContent = firstLine + (/[\r\n]/.test(content) ? '…' : '');
        form.classList.toggle('slk-compose-open', open);
        form.classList.toggle('slk-compose-previewing', !open && content.length > 0);
        document.body.classList.toggle('slk-composing', open && !pc);
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
    // v1.8.43: allow the native iOS tap to finish before changing geometry.
    // ST can leave the textarea focused before the first real tap. Expanding
    // it on pointerdown (or focus during a tap) moves the touch target while
    // WebKit is still deciding whether to open the software keyboard.
    const mobile = () => window.matchMedia('(max-width: 1000px)').matches;
    ta.addEventListener('focus', () => {
        if (!mobile()) requestExpand();
        // On mobile, programmatic focus alone is not a keyboard gesture.
        // The trusted click or actual keyboard viewport resize expands it.
    });
    ta.addEventListener('click', (event) => {
        if (!mobile() || !event.isTrusted) return;
        // Stay in the original user gesture; never blur/refocus or defer
        // focus itself. Let native selection and IME composition survive.
        if (document.activeElement !== ta) ta.focus({preventScroll: true});
        if (document.activeElement !== ta) return;
        pendingFocus = true;
        keyboardDismissed = false;
        // The click/default focus has completed before geometry changes.
        requestAnimationFrame(() => {
            if (document.activeElement === ta) syncHeight();
        });
    });
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
    window.matchMedia('(min-width: 1001px)').addEventListener?.('change', updateDisplay);
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
    const desktop = matchMedia('(min-width: 1001px)');
    const pc = () => desktop.matches && SLK_UI_SETTINGS.enabled && document.body.classList.contains('slk-ui');
    const visible = menu => menu && getComputedStyle(menu).display !== 'none';
    // ST owns both menu flags and Popper instances. Never hide a PC menu by
    // writing display/opacity independently of its native click handler.
    document.addEventListener('click', (e) => {
        const button = e.target.closest?.('#options_button, #extensionsMenuButton');
        if (!button) return;
        const otherId = button.id === 'options_button' ? 'extensionsMenu' : 'options';
        if (!pc()) {
            hideMenuEl(document.getElementById(otherId));
            return;
        }
        const jq = window.jQuery || window.$;
        const menu = document.getElementById(button.id === 'options_button' ? 'options' : 'extensionsMenu');
        const other = document.getElementById(otherId);
        const otherButton = document.getElementById(button.id === 'options_button' ? 'extensionsMenuButton' : 'options_button');
        if (!menu || typeof jq !== 'function' || typeof jq.fn?.stop !== 'function') return;
        // Finish queued animations before reading actual visibility. Run the
        // original direct jQuery handler without the same click also reaching
        // ST's hover-based outside-click handler. Menu items and outside
        // clicks themselves still use their untouched native handlers.
        const settle = el => { if (el) jq(el).stop(true, true); };
        settle(menu); settle(other);
        const wantOpen = !visible(menu);
        e.preventDefault();
        e.stopImmediatePropagation();
        const reconcile = (el, trigger, want) => {
            if (!el || !trigger) return;
            if (el.style.opacity === '0') el.style.removeProperty('opacity');
            for (let i = 0; i < 2 && Boolean(visible(el)) !== want; i++) {
                jq(trigger).triggerHandler('click');
                settle(el);
            }
        };
        reconcile(other, otherButton, false);
        reconcile(menu, button, wantOpen);
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
    const ctx = stContext();
    const hasMessages = !!chat.querySelector('.mes');
    const hasActiveTarget = Boolean(ctx && (
        (ctx.groupId !== undefined && ctx.groupId !== null && String(ctx.groupId) !== '') ||
        (ctx.characterId !== undefined && ctx.characterId !== null && Number(ctx.characterId) >= 0)
    ));
    const inChat = !chat.querySelector('.welcomePanel') && (hasMessages || hasActiveTarget);
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


function dedupeWelcomePanel() {
    const panel = document.querySelector('#chat .welcomePanel');
    if (!panel) return;

    const normalize = (text) => (text || '')
        .replace(/\s+/g, ' ')
        .replace(/[​-‍﻿]/g, '')
        .trim();

    const dedupeChildren = (root) => {
        const seen = new Set();
        [...root.children].forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            if (child.matches('style,script,template')) return;
            const keyText = normalize(child.textContent).slice(0, 360);
            const key = `${child.tagName}|${child.className}|${child.id}|${keyText}`;
            if (keyText && seen.has(key)) child.remove();
            else if (keyText) seen.add(key);
        });
    };

    dedupeChildren(panel);
    panel.querySelectorAll(':scope > div, :scope > section, :scope > ul').forEach((node) => dedupeChildren(node));
}


// v1.8.17: actual fixed status-area colour sample, independent of header design.
// The visible view and compact class are the same state used by the header.
let slkStatusActive = false;
function slkSplashIsVisible() {
    for (const el of document.querySelectorAll('#preloader, dialog[open] #loader')) {
        const style = getComputedStyle(el);
        if (el.getClientRects().length && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0) return true;
    }
    return false;
}
function slkSyncStatusBar() {
    const mobile = matchMedia('(max-width: 1000px)').matches;
    const body = document.body;
    const enabled = SLK_UI_SETTINGS.enabled && body?.classList.contains('slk-ui');
    const surface = document.getElementById('slk-status-surface');
    const root = document.documentElement;
    if (!mobile || !enabled) {
        if (!slkStatusActive) return;
        slkStatusActive = false;
        root.removeAttribute('data-slk-status-color');
        surface?.removeAttribute('data-slk-status-color');
        window.__slkStatusChrome?.restore();
        return;
    }
    slkStatusActive = true;
    const light = slkSplashIsVisible() || body.dataset.slkHeaderView === 'chat' || body.classList.contains('slk-header-compact');
    const state = light ? 'light' : 'purple';
    const desired = light ? '#FFFFFF' : '#441848';
    if (root.dataset.slkStatusColor !== state) root.dataset.slkStatusColor = state;
    if (surface && surface.dataset.slkStatusColor !== state) surface.dataset.slkStatusColor = state;
    // Both the early loader and live view use the same metadata owner.
    window.__slkStatusChrome?.set(desired);
}
function slkWatchStatusBar() {
    if (!document.getElementById('slk-status-surface')) {
        const surface = document.createElement('div');
        surface.id = 'slk-status-surface';
        surface.setAttribute('aria-hidden', 'true');
        document.body.appendChild(surface);
    }
    let queued = false;
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; slkSyncHeaderView(); slkSyncStatusBar(); });
    };
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, {attributes:true, attributeFilter:['class','data-slk-header-view']});
    const topSettings = document.getElementById('top-settings-holder');
    if (topSettings) new MutationObserver(records => {
        if (records.some(r => r.target.classList?.contains('drawer-icon') || r.target.classList?.contains('drawer-content'))) schedule();
    }).observe(topSettings, {attributes:true,attributeFilter:['class'],subtree:true});
    // Watch only loader lifecycle changes, not ordinary message/UI mutations.
    const loaderSelector = '#preloader, dialog:has(#loader)';
    const loaderNodes = new WeakSet();
    const loaderObserver = new MutationObserver(schedule);
    const watchLoader = el => {
        if (!el || loaderNodes.has(el)) return;
        loaderNodes.add(el);
        loaderObserver.observe(el, {attributes:true,attributeFilter:['class','style','hidden','open']});
    };
    document.querySelectorAll(loaderSelector).forEach(watchLoader);
    new MutationObserver(records => {
        let changed = false;
        for (const r of records) for (const n of [...r.addedNodes, ...r.removedNodes]) {
            if (n.nodeType !== 1) continue;
            const matches = n.matches(loaderSelector) ? [n] : [...n.querySelectorAll(loaderSelector)];
            if (!matches.length) continue;
            changed = true;
            matches.filter(el => el.isConnected).forEach(watchLoader);
        }
        if (changed) schedule();
    }).observe(document.body, {childList:true,subtree:true});
    document.addEventListener('close', e => { if (e.target.querySelector?.('#loader')) schedule(); }, true);
    window.addEventListener('resize',schedule);
    window.addEventListener('pageshow',schedule);
    window.addEventListener('focus',schedule);
    document.addEventListener('visibilitychange',schedule);
    window.addEventListener('slk-ui-settings-changed',schedule);
    schedule();
}


// v1.8.9 — One visible-surface source of truth for the header.
// ST keeps chat loaded while opening drawers. Hidden/leftover drawer icons must
// never decide whether the chat or a settings page is currently displayed.
function slkActiveHeaderView() {
    const current = window.__slkPanelNavigation?.getCurrent?.();
    if (current) {
        const root = document.querySelector(current);
        const content = root?.querySelector(':scope > .drawer-content');
        if (content && !content.classList.contains('slk-nav-hidden')) {
            return 'panel';
        }
    }
    if (document.body.classList.contains('slk-managed-navigation') && document.body.classList.contains('slk-no-panel')) {
        return document.body.classList.contains('slk-in-chat') ? 'chat' : 'home';
    }
    const roots = ['#ai-config-button', '#sys-settings-button',
        '#advanced-formatting-button', '#WI-SP-button',
        '#extensions-settings-button', '#persona-management-button',
        '#rightNavHolder', '#user-settings-button', '#backgrounds-button'];
    for (const sel of roots) {
        const content = document.querySelector(`${sel} > .drawer-content.openDrawer`);
        if (!content || content.classList.contains('slk-nav-hidden')) continue;
        const style = getComputedStyle(content);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (content.getBoundingClientRect().height < 24) continue;
        return 'panel';
    }
    return document.body.classList.contains('slk-in-chat') ? 'chat' : 'home';
}
function slkSyncHeaderView() {
    if (!document.body?.classList.contains('slk-ui')) return;
    const view = slkActiveHeaderView();
    if (document.body.dataset.slkHeaderView !== view) {
        document.body.dataset.slkHeaderView = view;
    }
    document.documentElement.classList.toggle('slk-status-chat', view === 'chat');
}

function syncSlackSurfaces() {
    syncChatHead();
    slkSyncHeaderView();
    slkSyncStatusBar();
    dedupeWelcomePanel();
}

function watchChat() {
    const chat = document.getElementById('chat');
    if (!chat) return;
    buildChatHead();
    slkWatchStatusBar();
    let queued = false;
    const run = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            syncSlackSurfaces();
        });
    };
    new MutationObserver(run).observe(chat, { childList: true });
    const routeRun = () => requestAnimationFrame(syncSlackSurfaces);
    window.addEventListener('hashchange', routeRun, { passive: true });
    document.addEventListener('click', () => requestAnimationFrame(syncSlackSurfaces), { passive: true, capture: true });
    setTimeout(syncSlackSurfaces, 0);
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
    const current = window.__slkPanelNavigation?.getCurrent?.();
    if (current) {
        const content = document.querySelector(`${current} > .drawer-content`);
        if (content && !content.classList.contains('slk-nav-hidden')) return content;
    }
    if (document.body.classList.contains('slk-managed-navigation') && document.body.classList.contains('slk-no-panel')) return null;
    return [...document.querySelectorAll('#top-settings-holder > .drawer > .drawer-content.openDrawer')].find(el =>
        !el.classList.contains('slk-nav-hidden') && getComputedStyle(el).display !== 'none' &&
        getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().height > 0) || null;
}

function recomputeHeaderCompact() {
    const open = openDrawerEl();
    if (open) {
        // Only the visible page's scroll surface, not hidden drawers or textareas.
        const inner = [...open.querySelectorAll('.scrollableInner')].filter(el => el.getClientRects().length && /auto|scroll/.test(getComputedStyle(el).overflowY));
        setHeaderCompact(open.scrollTop > 10 || inner.some(el => el.scrollTop > 10));
    } else {
        setHeaderCompact((document.getElementById('chat')?.scrollTop || 0) > 10);
    }
    slkSyncHeaderView();
    slkSyncStatusBar();
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
        if (open ? !(t === open || (open.contains(t) && t.matches('.scrollableInner'))) : t.id !== 'chat') return;
        recomputeHeaderCompact();
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
    const mq = window.matchMedia('(min-width: 0px)');
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
    // Disabled mode is deliberately a minimal settings-only loader. Never
    // inject Slack header, footer, AI tabs, icon replacements, or observers.
    if (!SLK_UI_SETTINGS.enabled) {
        document.body?.classList.remove('slk-ui', 'slk-footer-only-active', 'slk-managed-navigation');
        buildSlackUiExtensionSettings();
        if (!document.getElementById('slk-extension-settings')) {
            setTimeout(buildSlackUiExtensionSettings, 500);
            setTimeout(buildSlackUiExtensionSettings, 1500);
        }
        return;
    }
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
if (SLK_UI_SETTINGS.enabled) {
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
        // Set the visible header before the browser paints the new page.
        recomputeHeaderCompact();
        restoreScroll(layer);
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
            slkSyncNavGlyph(btn, active);
            btn.style.setProperty('background', active ? '#EFEAF0' : 'transparent', 'important');
            btn.style.setProperty('color', active ? '#4A154B' : '#616061', 'important');
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
            'border': '1px solid rgba(255,255,255,.75)',
            'border-radius': '999px',
            'background': 'rgba(255,255,255,.22)',
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
        matchMedia('(min-width: 0px)').matches;

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
// v1.8.75: Keep the label and dropdown in one row.
(function slkContainActiveWorldPicker() {
    const query = '(min-width: 0px)';
    let observedPicker = null;
    let pickerObserver = null;
    const overridden = new Map();
    const renamed = new Map();
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
        for (const [node, original] of renamed) if (node.nodeValue === '모든 채팅에 적용') node.nodeValue = original;
        renamed.clear();
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
        important(picker, 'grid-template-columns', 'max-content minmax(0, 1fr)');
        important(picker, 'align-items', 'center');
        const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode());) {
            if (/모든\s*채팅에\s*대한\s*활성화된\s*월드\s*인포(?:\(들\))?|active world info(?:s|\(s\))? for all chats/i.test(node.nodeValue.trim())) {
                renamed.set(node, node.nodeValue);
                node.nodeValue = '모든 채팅에 적용';
            }
        }
        important(picker, 'grid-template-rows', 'auto');
        important(picker, 'width', '100%');
        important(picker, 'min-width', '0');
        important(picker, 'max-width', '100%');
        important(picker, 'flex', '0 0 auto');
        for (const [el, column] of [[title, '1'], [field, '2']]) {
            important(el, 'display', 'block');
            important(el, 'grid-column', column);
            important(el, 'grid-row', '1');
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
            pickerObserver.observe(picker, { childList: true, subtree: true, characterData: true });
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
    const PLACEHOLDER = '선택 안 됨(여러개 가능)';
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
            it.textContent = o ? o.text : '선택 안 됨';
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
    const BOOT_CSS = "@media screen {\n  #preloader { background: #fff !important; color: transparent !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n  #preloader #load-spinner { display: none !important; }\n  dialog:has(#loader) { background: #fff !important; border:0 !important; box-shadow:none !important; inset:0 !important; width:100vw !important; height:100dvh !important; max-width:none !important; max-height:none !important; position:fixed !important; padding:0 !important; margin:0 !important; border-radius:0 !important; }\n  dialog:has(#loader)::backdrop { background:#fff !important; }\n  dialog:has(#loader) :is(.popup-body,.popup-content) { background:#fff !important; box-shadow:none !important; border:0 !important; width:100% !important; height:100% !important; padding:0 !important; margin:0 !important; }\n  dialog:has(#loader) .popup-controls { display:none !important; }\n  #loader, #loader.splash-screen { display:block !important; background:#fff !important; width:100% !important; height:100% !important; position:relative !important; transform:none !important; }\n  #loader .splash-logo, #loader #load-spinner, #loader .splash-message, #loader::before { display:none !important; visibility:hidden !important; content:none !important; }\n  #loader::after { content:\"\" !important; position:fixed !important; top:46.5dvh !important; left:50vw !important; display:block !important; width:74px !important; height:74px !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }\n  #preloader::after { content:\"\" !important; position:fixed !important; top:46.5dvh !important; left:50vw !important; display:block !important; width:74px !important; height:74px !important; transform:translate(-50%,-50%) !important; background:var(--slk-loader-icon) center/contain no-repeat !important; }\n}";
    const buildBlock = () => {
        // custom_css is loaded by SillyTavern before extensions: this also matches the chosen
        // logo on the *next initial loading screen*, before slack.js is evaluated.
        const imageUrl = slkSelectedSplashLogoUrl();
        const imageCss = ':root { --slk-loader-icon: url(' + JSON.stringify(imageUrl) + ') !important; }';
        return START + '\n' + imageCss + '\n' + BOOT_CSS + '\n' + "@layer slk-splash-chrome {\n @media screen and (max-width:1000px) {\n    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)), :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) > body, html:has(dialog[open] #loader), html:has(dialog[open] #loader) > body { background:#fff!important; color-scheme:only light!important; }\n    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader { position:fixed!important; inset:0!important; width:100%!important; height:100%!important; margin:0!important; background:#fff!important; color-scheme:only light!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }\n    html:has(dialog[open] #loader) dialog[open]:has(#loader) { background:#fff!important; color-scheme:only light!important; backdrop-filter:none!important; -webkit-backdrop-filter:none!important; }\n    html:has(dialog[open] #loader) dialog[open] #loader #load-spinner, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner, #slk-splash-chrome-sample {\n      display:block!important; position:fixed!important; inset:0 0 auto 0!important;\n      width:100%!important; min-width:0!important; max-width:none!important;\n      height:max(12px,env(safe-area-inset-top,0px))!important; min-height:12px!important; max-height:none!important;\n      margin:0!important; padding:0!important; border:0!important; border-radius:0!important;\n      background:#fff!important; color:transparent!important; font-size:0!important;\n      opacity:1!important; visibility:visible!important; box-shadow:none!important; text-shadow:none!important;\n      transform:none!important; animation:none!important; transition:none!important; filter:none!important;\n      backdrop-filter:none!important; -webkit-backdrop-filter:none!important;\n      overflow:hidden!important; pointer-events:none!important; z-index:2147483646!important;\n    }\n    html:has(dialog[open] #loader) #loader #load-spinner::before, html:has(dialog[open] #loader) #loader #load-spinner::after,\n    :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner::before, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner::after,\n    html:has(dialog[open] #loader) #loader #load-spinner > *, :is(html:has(> body:not(.slk-ui) #preloader:not([hidden],.hidden,.displayNone,[style*=\"display: none\"],[style*=\"display:none\"],[style*=\"visibility: hidden\"],[style*=\"visibility:hidden\"],[style*=\"opacity: 0;\"],[style*=\"opacity:0;\"])),html:has(#preloader > #slk-splash-chrome-sample)) #preloader #load-spinner > * {display:none!important;content:none!important;}\n }\n @media screen and (min-width:1001px) {#slk-splash-chrome-sample {display:none!important;}}\n}" + '\n' + END;
    };
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
        const next = SLK_UI_SETTINGS.enabled ? (base ? base + '\n\n' : '') + buildBlock() : base;
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

// v1.4.84 — 메시지 ⋯ 메뉴: ST 기본 아이콘 먼저, 타 확장 아이콘은 그 뒤에 배치.
// 기존 두 개의 수집/정렬 옵저버를 하나로 통합합니다. 기존 DOM 버튼만 이동하므로 클릭 리스너는 유지됩니다.
(function slkUnifiedMessageActions() {
    const states = new WeakMap();
    const mobile = () => document.body.classList.contains('slk-ui') &&
        window.matchMedia('(min-width: 0px)').matches;

    function isOpen(extra) {
        if (document.body.classList.contains('expandMessageActions')) return true;
        // 실리태번 ⋯ 토글은 인라인 display를 사용합니다. 테마 CSS가 강제한
        // computed display는 열림 판정에 쓰지 않습니다(닫힌 메뉴가 계속 열리는 문제 예방).
        return Boolean(extra.style.display && extra.style.display !== 'none');
    }

    // v1.4.84 — The extension system does not mandate one button class or one
    // injection location. Collect action elements from the message header and
    // avatar area, not just special-case reload/refresh icons. Do not assume
    // icons are Font Awesome: some extensions render CSS masks/backgrounds,
    // emoji or inline text and those must remain usable.
    function foreignActions(mes, box) {
        const header = mes.querySelector(':scope > .mes_block > .ch_name');
        const avatar = mes.querySelector(':scope > .mesAvatarWrapper');
        const scopes = [avatar, header].filter(Boolean);
        const actionSelector = [
            'button', '[role="button"]', 'a[href]', '.mes_button', '.menu_button',
            '[data-action]', '[onclick]', '[tabindex]', '[title]', '[aria-label]',
            '.fa-solid', '.fa-regular', '.fa-brands'
        ].join(',');
        const candidateSet = new Set();
        for (const scope of scopes) {
            for (const node of scope.querySelectorAll(actionSelector)) {
                const action = node.closest('button, [role="button"], a[href], .mes_button, .menu_button, [data-action]') || node;
                if (action === scope || candidateSet.has(action)) continue;
                candidateSet.add(action);
            }
        }
        // Some extensions append a bare action next to the native message
        // structure rather than inside the header. Only collect explicit action
        // controls there, never user content or the swipe/navigation controls.
        for (const node of mes.querySelectorAll(':scope > button, :scope > [role="button"], :scope > .mes_button, :scope > .menu_button')) {
            candidateSet.add(node);
        }
        const skip = '.avatar, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .timestamp, .name_text, .mes_ghost, .swipe_left, .swipeRightBlock, .mes_buttons, .mes_edit_buttons, .extraMesButtons, .extraMesButtonsHint, .for_checkbox, .del_checkbox';
        return [...candidateSet].filter(el => {
            if (!el?.isConnected || el === box || box.contains(el)) return false;
            if (el.matches(skip)) return false;
            if (el.closest('.avatar, .mesIDDisplay, .mes_timer, .tokenCounterDisplay, .mes_text, .mes_reasoning_details, .mes_edit_buttons, .swipeRightBlock, .mes_media_wrapper, .mes_file_wrapper, .mes_bias, .mes_buttons')) return false;
            if (el.matches('input, label, select, textarea, [hidden], .displayNone, .mes_edit')) return false;
            const explicit = el.matches('button, [role="button"], a[href], .mes_button, .menu_button, [data-action], [onclick], .fa-solid, .fa-regular, .fa-brands');
            const iconHint = el.querySelector('svg, i, img, [class*="icon"], [class*="fa-"]');
            const action = explicit || (iconHint && el.matches('[title], [aria-label], [tabindex]'));
            if (!action || el.style.display === 'none' || el.style.visibility === 'hidden') return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        }).filter(el => ![...candidateSet].some(parent => parent !== el &&
            parent.contains(el) && parent.matches('button, [role="button"], a[href], .mes_button, .menu_button, [data-action]')));
    }

    function hasIcon(el) {
        const children = el.querySelectorAll('svg, img, i, [class*="fa-"]');
        for (const node of children) {
            const c = getComputedStyle(node);
            if (c.display === 'none' || c.visibility === 'hidden' || c.opacity === '0') continue;
            if (node.matches('svg, img')) return true;
            const b = getComputedStyle(node, '::before');
            const text = b.content;
            const hasGlyph = text && !['none', 'normal', '""', "''"].includes(text);
            if (hasGlyph || (b.maskImage && b.maskImage !== 'none') || (b.webkitMaskImage && b.webkitMaskImage !== 'none')) return true;
        }
        const b = getComputedStyle(el, '::before');
        const c = b.content;
        return b.display !== 'none' && b.visibility !== 'hidden' && b.opacity !== '0' &&
            Boolean((c && !['none', 'normal', '""', "''"].includes(c)) ||
                    (b.backgroundImage && b.backgroundImage !== 'none') ||
                    (b.maskImage && b.maskImage !== 'none') ||
                    (b.webkitMaskImage && b.webkitMaskImage !== 'none'));
    }

    function move(el, dest, state, first = false) {
        if (!state.origins.has(el)) {
            const anchor = document.createComment('slk-action-original');
            el.parentNode.insertBefore(anchor, el);
            state.origins.set(el, anchor);
        }
        if (first) dest.insertBefore(el, dest.firstChild);
        else dest.appendChild(el);
    }
    // Remember the actual two header track heights while the ⋯ menu is closed.
    // The visible message title/timestamp vary by message, so a hardcoded
    // header height would make some menus jump when expanded.
    function rememberClosedHeaderRows(mes) {
        if (mes.classList.contains('slk-mes-expanded')) return;
        const computed = getComputedStyle(mes).gridTemplateRows;
        const tracks = [...computed.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)px(?=\s|$)/g)]
            .slice(0, 2).map(match => match[1] + 'px');
        if (tracks.length !== 2) return;
        const value = tracks.join(' ');
        if (mes.style.getPropertyValue('--slk-actions-closed-rows') !== value) {
            mes.style.setProperty('--slk-actions-closed-rows', value);
        }
    }
    function sync(mes) {
        const box = mes.querySelector(':scope > .mes_block > .ch_name > .mes_buttons');
        const extra = box?.querySelector(':scope > .extraMesButtons');
        if (!box || !extra) return;
        const state = states.get(mes) || { origins: new Map() };
        const open = mobile() && isOpen(extra);
        if (!open) {
            if (extra.style.getPropertyValue('--slk-actions-shift')) extra.style.removeProperty('--slk-actions-shift');
            if (state.origins.size) {
                for (const [el, anchor] of [...state.origins.entries()].reverse()) {
                    if (anchor.isConnected) anchor.replaceWith(el);
                }
                state.origins.clear();
            }
            if (mes.classList.contains('slk-mes-expanded')) mes.classList.remove('slk-mes-expanded');
            if (mes.hasAttribute('data-slk-actions-flow')) mes.removeAttribute('data-slk-actions-flow');
            rememberClosedHeaderRows(mes);
            return;
        }
        states.set(mes, state);
        // SillyTavern 기본 액션은 본래 순서를 유지합니다.
        // 외부 확장의 새로고침/추가 액션은 항상 기본 액션 뒤에 위치시킵니다.
        const nativeSelector = [
            '.mes_translate', '.sd_message_gen', '.mes_narrate', '.mes_prompt',
            '.mes_hide', '.mes_unhide', '.mes_media_gallery', '.mes_media_list',
            '.mes_embed', '.mes_swipe_picker', '.mes_create_bookmark',
            '.mes_create_branch', '.mes_copy', '.mes_bookmark',
        ].join(', ');
        const isNative = el => el.matches(nativeSelector);
        const foreign = foreignActions(mes, box);
        // 편집(연필)은 원래부터 ⋯ 바깥의 독립 버튼입니다.
        // 메뉴로 이동시키거나 확장 버튼으로 오분류하지 않습니다.
        const direct = [...box.children].filter(el =>
            el !== extra && !el.classList.contains('extraMesButtonsHint') &&
            !el.matches('.mes_edit'));
        for (const el of direct.filter(isNative)) move(el, extra, state);
        for (const el of [...foreign, ...direct.filter(el => !isNative(el))]) {
            if (el.parentElement !== extra) move(el, extra, state);
            el.classList.add('slk-adopted-btn', 'slk-foreign-action');
        }
        // 확장이 처음부터 extraMesButtons 안에 삽입한 경우도 마지막에 배치.
        // CSS order만 지정하고 기존 버튼 노드/리스너는 변경하지 않습니다.
        for (const el of extra.children) {
            el.classList.toggle('slk-foreign-action', !isNative(el));
            // 연필은 독립 편집 버튼이므로 펼침 메뉴의 중복 연필은 숨깁니다.
            el.classList.toggle('slk-action-pencil-duplicate', el.matches('.mes_edit'));
        }

        // Do not drop third-party actions for failing icon detection. Plugins
        // frequently use custom masks, background images, emoji or delayed SVGs.
        // Respect explicit hidden state; for native ST actions only, keep the
        // older glyph check to avoid reserving empty conditional menu slots.
        for (const el of extra.children) {
            const cs = getComputedStyle(el);
            const explicitHidden = el.hidden || el.hasAttribute('hidden') ||
                el.classList.contains('displayNone') || el.style.display === 'none' ||
                el.style.visibility === 'hidden' || cs.visibility === 'hidden';
            const absent = explicitHidden || (isNative(el) && !hasIcon(el));
            el.classList.toggle('slk-action-noicon', absent);
        }
        if (!mes.classList.contains('slk-mes-expanded')) mes.classList.add('slk-mes-expanded');
        if (!mes.hasAttribute('data-slk-actions-flow')) mes.setAttribute('data-slk-actions-flow', '');
        // v1.4.85 — Vertical alignment is owned by the grid CSS.
        // Do not translate the menu after the row count changes: multi-row
        // messages (and messages decorated by extensions) would jump upwards.
        extra.style.removeProperty('--slk-actions-shift');
    }

    function run() { document.querySelectorAll('#chat .mes').forEach(sync); }
    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => { scheduled = false; run(); }, 35);
    }
    function start() {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        run();
        new MutationObserver(schedule).observe(chat, { subtree: true, childList: true, attributes: true,
            attributeFilter: ['style', 'class', 'hidden'] });
        document.addEventListener('click', e => {
            const hint = e.target.closest?.('#chat .extraMesButtonsHint');
            if (!hint) return;
            const mes = hint.closest('.mes');
            const extra = mes?.querySelector('.mes_buttons > .extraMesButtons');
            setTimeout(run, 0);
            setTimeout(run, 90);
        }, true);
        window.addEventListener('slk-ui-settings-changed', schedule);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();

// v1.4.64 — 확장이 직접 만든 팝업(고정 위치 창)을 찾아 slk-modal 클래스 부여 → 슬랙 팝업 디자인
(function slkForeignModals() {
    const OURS = '#completion_prompt_manager_popup, #slk-header, #slk-mobile-footer, #slk-settings-menu, #toast-container, #send_form, #form_sheld, .drawer-content, #top-bar, #top-settings-holder, #chat, #bg1, #bg_custom, #preloader, dialog.popup';
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

// v1.4.80 — Keep the original swipe controls in ONE parent, avoiding
// competing absolute/grid positioning of .swipe_left versus .swipeRightBlock.
// The original elements are moved, NOT cloned; SillyTavern handlers survive.
(function slkGroupNativeSwipeControls() {
    const isEnabled = () => document.body.classList.contains('slk-ui');
    const syncMessage = (mes, enabled) => {
        const mesBlock = mes.querySelector(':scope > .mes_block');
        const holder = mes.querySelector(':scope > .swipeRightBlock');
        if (!mesBlock || !holder) return;
        const left = mes.querySelector(':scope > .swipe_left') ||
            holder.querySelector(':scope > .swipe_left');
        const counter = holder.querySelector(':scope > .swipes-counter');
        const right = holder.querySelector(':scope > .swipe_right');
        if (!left || !counter || !right) return;

        if (enabled) {
            // Preserve the original nodes and their click handlers. Complete the
            // row in the same mutation-observer checkpoint, before the next paint.
            if (holder.firstElementChild !== left) holder.insertBefore(left, holder.firstElementChild);
            if (left.nextElementSibling !== counter) holder.insertBefore(counter, left.nextSibling);
            if (counter.nextElementSibling !== right) holder.insertBefore(right, counter.nextSibling);
            if (!holder.classList.contains('slk-swipe-inline')) holder.classList.add('slk-swipe-inline');
        } else if (holder.classList.contains('slk-swipe-inline')) {
            mes.insertBefore(left, mesBlock);
            if (right.nextElementSibling !== counter) holder.insertBefore(right, counter);
            holder.classList.remove('slk-swipe-inline');
        }
    };
    const sync = () => {
        const enabled = isEnabled();
        document.querySelectorAll('#chat .mes').forEach(mes => syncMessage(mes, enabled));
    };
    const start = () => {
        const chat = document.getElementById('chat');
        if (!chat) { setTimeout(start, 500); return; }
        sync();
        const structure = '.mes, .mes_block, .swipeRightBlock, .swipe_left, .swipe_right, .swipes-counter';
        new MutationObserver(records => {
            const changed = new Set();
            for (const record of records) {
                const target = record.target;
                if (!(target instanceof Element)) continue;
                const mes = target.closest('.mes');
                if (record.type === 'attributes') {
                    if (mes && target.matches(structure)) changed.add(mes);
                    continue;
                }
                // Ignore ordinary text/token streaming; only the message shell
                // or swipe-control structure needs to be regrouped.
                if (mes && (target === mes || target.matches('.swipeRightBlock'))) changed.add(mes);
                if (!mes) for (const node of record.addedNodes) {
                    if (!(node instanceof Element)) continue;
                    if (node.matches('.mes')) changed.add(node);
                    else node.querySelectorAll('.mes').forEach(m => changed.add(m));
                }
            }
            const enabled = isEnabled();
            for (const mes of changed) if (chat.contains(mes)) syncMessage(mes, enabled);
        }).observe(chat, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
        window.addEventListener('slk-ui-settings-changed', sync);
        window.addEventListener('resize', sync);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();


// v1.5.6 — Size the UI-language selector to the real Settings Search field.
// Both controls live in separate native ST rows; fixed percentages cannot
// align them when account/admin buttons or the viewport width change.
(function slkMatchLanguageToSearch() {
    let scheduled = false;
    const sync = () => {
        scheduled = false;
        const panel = document.getElementById('user-settings-block');
        const row = panel?.querySelector('#UI-language-block');
        const search = panel?.querySelector('#settingsSearch');
        const account = panel?.querySelector('#account_controls');
        if (!row || !search || !account) return;
        if (!document.body.classList.contains('slk-ui') ||
            !window.matchMedia('(min-width: 0px)').matches) return;
        const langRect = row.getBoundingClientRect();
        const searchRect = search.getBoundingClientRect();
        const accountRect = account.getBoundingClientRect();
        // Closed drawers measure zero: wait until the panel is visible.
        if (!langRect.width || !searchRect.width || !accountRect.width) return;
        const isWrapped = searchRect.top >= accountRect.bottom - 2;
        const isTooWide = searchRect.width > langRect.width - 76;
        const stacked = isWrapped || isTooWide;
        row.classList.toggle('slk-language-stacked', stacked);
        const matchWidth = Math.min(searchRect.width, langRect.width);
        const value = `${Math.round(matchWidth * 100) / 100}px`;
        if (row.style.getPropertyValue('--slk-language-match-search') !== value)
            row.style.setProperty('--slk-language-match-search', value);
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(sync);
    };
    const start = () => {
        const panel = document.getElementById('user-settings-block');
        const search = panel?.querySelector('#settingsSearch');
        const account = panel?.querySelector('#account_controls');
        if (!panel || !search || !account) return;
        window.addEventListener('resize', schedule);
        window.addEventListener('slk-ui-settings-changed', schedule);
        const ro = new ResizeObserver(schedule);
        ro.observe(panel);
        ro.observe(search);
        ro.observe(account);
        new MutationObserver(schedule).observe(panel, {
            attributes: true, attributeFilter: ['style', 'class'],
        });
        new MutationObserver(schedule).observe(account, {
            attributes: true, childList: true, subtree: true,
            attributeFilter: ['style', 'class'],
        });
        schedule();
    };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();


// v1.5.9 — Anchor SillyTavern's existing Backups panel to its actual button.
// The native backup buttons and list remain intact; only positioning changes.
(function slkAnchorChatBackups() {
    let scheduled = false;
    function sync() {
        scheduled = false;
        if (!document.body.classList.contains('slk-ui') ||
            !window.matchMedia('(min-width: 0px)').matches) return;
        const popup = document.getElementById('select_chat_popup');
        const panel = popup?.querySelector('.chatBackupsList');
        const trigger = popup?.querySelector('[name="selectChatPopupHeader"] button.menu_button:has(.fa-box-open)');
        if (!popup || !panel || !trigger || !panel.classList.contains('open')) return;
        const popupRect = popup.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();
        if (!popupRect.width || !triggerRect.width) return;
        const value = Math.max(0, Math.round((triggerRect.bottom - popupRect.top + 8) * 100) / 100) + 'px';
        if (popup.style.getPropertyValue('--slk-backups-top') !== value)
            popup.style.setProperty('--slk-backups-top', value);
    }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(sync);
    }
    function start() {
        const popup = document.getElementById('select_chat_popup');
        if (!popup) return;
        new MutationObserver(schedule).observe(popup, {
            subtree: true, childList: true, attributes: true,
            attributeFilter: ['class'],
        });
        window.addEventListener('resize', schedule);
        window.addEventListener('orientationchange', schedule);
        popup.addEventListener('click', schedule);
        schedule();
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();


// v1.5.11 — Desktop Slack navigation: the same 7 mobile-footer icons become
// a narrow vertical workspace rail; their real SillyTavern panels open in the
// adjacent column (not as floating overlays over chat).
(function mountSlackDesktopRail() {
    const desktop = window.matchMedia('(min-width: 1001px)');
    const navSelectors = TABS.map(([selector]) => selector);
    const extraSelectors = [DRAWERS.userSettings, DRAWERS.backgrounds].filter(Boolean);
    const selectors = [...new Set([...navSelectors, ...extraSelectors])];
    const labelMap = new Map(TABS.map(([selector, , label]) => [selector, label]));
    labelMap.set(DRAWERS.userSettings, '사용자 설정');
    labelMap.set(DRAWERS.backgrounds, '배경');
    let active = null;
    let initialized = false;
    let panelHeader = null;
    let contextHeader = null;
    let panelTitle = null;
    let contextTitle = null;
    // Native ST excludes pinned drawers from its outside-press auto-close.
    // These pins are temporary PC navigation state, never persisted settings.
    const pcPins = new Map();
    function syncTemporaryPin(el, name, on) {
        if (!el) return;
        if (on) {
            if (!el.classList.contains(name)) {
                pcPins.set(el, name);
                el.classList.add(name);
            }
        } else if (pcPins.get(el) === name) {
            pcPins.delete(el);
            el.classList.remove(name);
        }
    }
    function releaseTemporaryPins() {
        for (const [el, name] of pcPins) el.classList.remove(name);
        pcPins.clear();
    }

    const isDesktop = () => desktop.matches && SLK_UI_SETTINGS.enabled && document.body?.classList.contains('slk-ui');
    const partsFor = (selector) => {
        const root = document.querySelector(selector);
        return root && {
            root,
            content: root.querySelector(':scope > .drawer-content'),
            icon: root.querySelector(':scope > .drawer-toggle > .drawer-icon'),
            toggle: root.querySelector(':scope > .drawer-toggle'),
        };
    };

    function makeChrome() {
        if (!panelHeader) {
            panelHeader = document.getElementById('slk-pc-panel-heading');
            if (!panelHeader) {
                panelHeader = document.createElement('div');
                panelHeader.id = 'slk-pc-panel-heading';
                panelHeader.innerHTML = `<h2 id="slk-pc-panel-title"></h2><button type="button" id="slk-pc-panel-close" aria-label="패널 닫기" title="패널 닫기"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
                document.body.append(panelHeader);
                // The sidebar's active tab is the only close control on PC.
            }
            panelTitle = panelHeader.querySelector('#slk-pc-panel-title');
        }
        if (!contextHeader) {
            contextHeader = document.getElementById('slk-pc-channel-heading');
            if (!contextHeader) {
                contextHeader = document.createElement('div');
                contextHeader.id = 'slk-pc-channel-heading';
                contextHeader.innerHTML = `<span class="slk-pc-channel-symbol">#</span><strong id="slk-pc-channel-title">최근 채팅</strong>`;
                document.body.append(contextHeader);
            }
            contextTitle = contextHeader.querySelector('#slk-pc-channel-title');
        }
    }

    function syncContext() {
        if (!isDesktop()) return;
        const inChat = document.body.classList.contains('slk-in-chat');
        const text = inChat ? (document.getElementById('slk-chat-title')?.querySelector('.slk-ch-name')?.textContent || chatInfo().name || '채팅') : '최근 채팅';
        if (contextTitle && contextTitle.textContent !== text) contextTitle.textContent = text;
        if (contextHeader) contextHeader.classList.toggle('slk-pc-is-chat', inChat);
    }

    // Desktop selection is authoritative. Native ST outside-click handlers can
    // remove openDrawer/openIcon (even after an async animation), but must not
    // close the side-by-side PC panel. Reconcile only top-level drawer flags;
    // never cancel chat clicks, nested controls, or modal interactions.
    function syncDrawerFlags() {
        if (!isDesktop() || !initialized) return;
        for (const item of selectors) {
            const parts = partsFor(item);
            if (!parts?.content) continue;
            const open = item === active;
            const setFlag = (el, name, value) => {
                if (el && el.classList.contains(name) !== value) el.classList.toggle(name, value);
            };
            syncTemporaryPin(parts.content, 'pinnedOpen', open);
            syncTemporaryPin(parts.icon, 'drawerPinnedOpen', open);
            setFlag(parts.content, 'openDrawer', open);
            setFlag(parts.content, 'closedDrawer', !open);
            if (open) {
                setFlag(parts.content, 'displayNone', false);
                if (parts.content.hidden) parts.content.hidden = false;
                if (parts.content.style.display === 'none') parts.content.style.removeProperty('display');
                // A native close animation can leave a visible panel with
                // a stale inline input/scroll lock. Only repair the panel root.
                if (parts.content.style.pointerEvents === 'none') parts.content.style.removeProperty('pointer-events');
                if (['hidden', 'clip'].includes(parts.content.style.overflowY)) parts.content.style.removeProperty('overflow-y');
            }
            setFlag(parts.icon, 'openIcon', open);
            setFlag(parts.icon, 'closedIcon', !open);
            setFlag(parts.root, 'slk-pc-selected', open);
            if (parts.toggle && parts.toggle.getAttribute('aria-expanded') !== String(open)) {
                parts.toggle.setAttribute('aria-expanded', String(open));
            }
        }
        document.body.classList.toggle('slk-pc-panel-open', Boolean(active));
    }

    let drawerObserver = null;
    function watchDrawerFlags() {
        if (drawerObserver) return;
        const holder = document.getElementById('top-settings-holder');
        if (!holder) return;
        drawerObserver = new MutationObserver(records => {
            if (!isDesktop() || !initialized) return;
            const relevant = new Set(selectors.flatMap(item => {
                const p = partsFor(item);
                return p ? [p.root, p.content, p.icon, p.toggle].filter(Boolean) : [];
            }));
            if (records.some(record => relevant.has(record.target))) syncDrawerFlags();
        });
        drawerObserver.observe(holder, {subtree: true, attributes: true, attributeFilter: ['class', 'aria-expanded', 'style', 'hidden']});
    }

    function activate(selector) {
        if (!isDesktop()) return;
        active = selector && selectors.includes(selector) && partsFor(selector)?.content ? selector : null;
        syncDrawerFlags();
        if (panelTitle) panelTitle.textContent = labelMap.get(active) || '';
        if (panelHeader) panelHeader.setAttribute('aria-hidden', String(!active));
        if (active === DRAWERS.character) {
            document.getElementById('rm_print_characters_block')?.dispatchEvent(new Event('scroll'));
        }
        syncContext();
        window.dispatchEvent(new CustomEvent('slk-pc-active', { detail: active }));
    }

    function toggle(selector) {
        if (!isDesktop()) return;
        activate(active === selector ? null : selector);
    }

    // Capture the click ahead of ST's asynchronous drawer toggle: otherwise
    // rapid switching triggers its delayed close/open animation and flickers.
    function captureRailClick(event) {
        if (!isDesktop()) return;
        const toggleEl = event.target.closest?.('#top-settings-holder > .drawer > .drawer-toggle');
        if (!toggleEl) return;
        const id = toggleEl.parentElement?.id;
        const selector = id && `#${id}`;
        if (!navSelectors.includes(selector)) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        toggle(selector);
    }

    function captureRailPointer(event) {
        if (!isDesktop()) return;
        const toggleEl = event.target.closest?.('#top-settings-holder > .drawer > .drawer-toggle');
        if (toggleEl && navSelectors.includes(`#${toggleEl.parentElement?.id}`)) event.stopPropagation();
    }

    function syncViewport() {
        if (!document.body) return;
        if (!isDesktop()) {
            drawerObserver?.disconnect();
            drawerObserver = null;
            releaseTemporaryPins();
            if (initialized && active) {
                // The mobile controller owns the drawer classes after switching
                // back to a narrow screen. Do not leave a desktop tab open.
                for (const item of selectors) {
                    const parts = partsFor(item);
                    if (!parts?.content) continue;
                    parts.content.classList.remove('openDrawer');
                    parts.content.classList.add('closedDrawer');
                    parts.icon?.classList.remove('openIcon');
                    parts.icon?.classList.add('closedIcon');
                    parts.root.classList.remove('slk-pc-selected');
                }
            }
            active = null;
            document.body.classList.remove('slk-pc-panel-open');
            panelHeader?.setAttribute('aria-hidden', 'true');
            contextHeader?.setAttribute('aria-hidden', 'true');
            return;
        }
        makeChrome();
        watchDrawerFlags();
        const initiallyOpen = !initialized && selectors.find(sel => partsFor(sel)?.content?.classList.contains('openDrawer'));
        initialized = true;
        activate(initiallyOpen || active);
        contextHeader?.setAttribute('aria-hidden', 'false');
    }

    window.__slkDesktopRailNavigation = { toggle, getCurrent: () => active };
    document.addEventListener('click', captureRailClick, true);
    document.addEventListener('mousedown', captureRailPointer, true);
    document.addEventListener('touchstart', captureRailPointer, true);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncViewport, { once: true });
    else syncViewport();
    desktop.addEventListener?.('change', syncViewport);
    window.addEventListener('slk-ui-settings-changed', syncViewport);
    window.addEventListener('pageshow', syncViewport);
    // Chat/channel heading stays synced even when the character changes.
    let refreshRequested = false;
    const triggerRefresh = () => {
        if (!refreshRequested) {
            refreshRequested = true;
            requestAnimationFrame(() => { refreshRequested = false; syncContext(); });
        }
    };
    new MutationObserver(triggerRefresh).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.getElementById('slk-chat-head') &&
        new MutationObserver(triggerRefresh).observe(document.getElementById('slk-chat-head'), { subtree: true, childList: true, characterData: true });
})();


// v1.6.1 — Slack desktop: independent brand rail + navigation sidebar.
// Leftmost column contains only the Slack workspace image; the adjoining
// lighter purple column contains all 7 tabs plus Settings and Background.
// All buttons reuse the real native SillyTavern drawer content and handlers.
(function mountSlackPcChrome() {
    const desktop = window.matchMedia('(min-width: 1001px)');
    const ITEMS = TABS.map(([selector, icon, label]) => ({ selector, icon: ICONS[icon], label }));
    const BOTTOM = [
        { selector: DRAWERS.userSettings, icon: ICONS.userSettings, label: '설정' },
        { selector: DRAWERS.backgrounds, icon: ICONS.backgrounds, label: '배경' },
    ];
    let brandRail = null;
    let sectionMenu = null;
    let versionDisplay = null;
    let headerChrome = null;
    let trafficLights = null;
    let versionRequest = null;
    const nav = () => window.__slkDesktopRailNavigation;
    const itemMarkup = ({ selector, icon, label }) =>
        `<button type="button" class="slk-pc-item" data-drawer="${selector}" title="${label}" aria-label="${label}" aria-pressed="false">` +
        `<span class="slk-pc-item-icon">${icon}</span><span class="slk-pc-item-label">${label}</span></button>`;

    function mark(active) {
        sectionMenu?.querySelectorAll('.slk-pc-item').forEach(button => {
            const on = button.dataset.drawer === active;
            button.classList.toggle('active', on);
            button.setAttribute('aria-pressed', String(on));
            slkSyncNavGlyph(button, on, button.querySelector('.slk-pc-item-icon'));
        });
    }

    function build() {
        if (!document.body) return;
        if (!brandRail) {
            brandRail = document.createElement('nav');
            brandRail.id = 'slk-pc-rail';
            brandRail.setAttribute('aria-label', 'Slack 워크스페이스');
            brandRail.innerHTML = `<button type="button" class="slk-pc-ws" title="Slack" aria-label="Slack" aria-disabled="true"><img alt="Slack" src="${SLK_SLACK_HEADER_IMAGE}"></button>`;
            document.body.appendChild(brandRail);
            for (const type of ['touchstart', 'mousedown']) brandRail.addEventListener(type, e => e.stopPropagation());
            brandRail.querySelector('.slk-pc-ws').addEventListener('click', e => e.stopPropagation());
        }
        if (!sectionMenu) {
            sectionMenu = document.createElement('nav');
            sectionMenu.id = 'slk-pc-sidebar';
            sectionMenu.setAttribute('aria-label', 'Slack UI 설정 메뉴');
            sectionMenu.innerHTML = `
                <div class="slk-pc-section-main" aria-label="주요 메뉴">
                    ${ITEMS.map(itemMarkup).join('')}
                </div>
                <div class="slk-pc-section-utility" aria-label="추가 메뉴">
                    ${BOTTOM.map(itemMarkup).join('')}
                </div>`;
            document.body.appendChild(sectionMenu);
            for (const type of ['touchstart', 'mousedown']) sectionMenu.addEventListener(type, e => e.stopPropagation());
            sectionMenu.addEventListener('click', event => {
                const button = event.target.closest('.slk-pc-item');
                if (!button) return;
                event.preventDefault();
                nav()?.toggle(button.dataset.drawer);
            });
        }
        if (!versionDisplay) {
            // A static label in the existing top-bar slot, not a search control.
            versionDisplay = document.createElement('div');
            versionDisplay.id = 'slk-pc-search';
            versionDisplay.setAttribute('aria-live', 'polite');
            versionDisplay.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="slk-pc-version-label">SillyTavern</span>';
            // Desktop-only decorative controls; no navigation or bot actions.
            headerChrome = document.createElement('div');
            headerChrome.id = 'slk-pc-header-chrome';
            const history = document.createElement('div');
            history.className = 'slk-pc-history';
            history.setAttribute('aria-hidden', 'true');
            history.innerHTML = `
                <span class="slk-pc-history-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M19 12H5m7-7-7 7 7 7"/></svg></span>
                <span class="slk-pc-history-icon is-muted"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></span>
                <span class="slk-pc-history-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="12" cy="12" r="9.5"/><path d="M12 6v6h5"/></svg></span>`;
            const bot = document.createElement('span');
            bot.className = 'slk-pc-bot';
            bot.setAttribute('aria-hidden', 'true');
            const botImage = document.createElement('img');
            botImage.alt = '';
            botImage.src = new URL('./slack-bot.webp', import.meta.url).href;
            botImage.draggable = false;
            bot.appendChild(botImage);
            headerChrome.append(history, versionDisplay, bot);
            document.body.appendChild(headerChrome);
        }
        if (!trafficLights) {
            trafficLights = document.createElement('div');
            trafficLights.id = 'slk-pc-traffic';
            trafficLights.setAttribute('aria-hidden', 'true');
            trafficLights.innerHTML = `
                <span class="slk-pc-traffic-light is-close"><svg viewBox="0 0 8 8" aria-hidden="true" focusable="false"><path d="M1.25 1.25 6.75 6.75M6.75 1.25 1.25 6.75" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
                <span class="slk-pc-traffic-light is-minimize"><svg viewBox="0 0 8 8" aria-hidden="true" focusable="false"><path d="M1 4h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
                <span class="slk-pc-traffic-light is-zoom"><svg viewBox="0 0 8 8" aria-hidden="true" focusable="false"><path d="M.5 .5H6.5L.5 6.5ZM7.5 7.5H1.5L7.5 1.5Z" fill="currentColor" stroke="none"/></svg></span>`;
            document.body.appendChild(trafficLights);
        }
        const on = desktop.matches && SLK_UI_SETTINGS.enabled;
        document.body.classList.toggle('slk-pc', on);
        brandRail.hidden = !on;
        sectionMenu.hidden = !on;
        versionDisplay.hidden = !on;
        headerChrome.hidden = !on;
        trafficLights.hidden = !on;
        if (on && !versionRequest) {
            versionRequest = fetchVersion().then(v => {
                const parts = [v?.pkgVersion, v?.gitBranch].filter(Boolean);
                versionDisplay.querySelector('.slk-pc-version-label').textContent = parts.length ? parts.join(' ') : 'SillyTavern · 버전 확인 불가';
                if (!v?.pkgVersion) versionRequest = null;
            });
        }
        mark(nav()?.getCurrent?.() ?? null);
    }

    window.addEventListener('slk-pc-active', e => mark(e.detail));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once: true });
    else build();
    desktop.addEventListener?.('change', build);
    window.addEventListener('slk-ui-settings-changed', build);
})();

// v1.8.22: isolate ONLY the prompt editor from the generic native drawer
// lifecycle. SillyTavern opens/closes it by ID and the openDrawer class.
// Keep that class and all original inputs/listeners. Portal before the first
// click, and again whenever ST replaces the editor; never wait for another tap.
function slkPortalPromptEditor(popup = document.getElementById('completion_prompt_manager_popup')) {
    if (!popup || !document.body) return;
    const enabled = document.body.classList.contains('slk-ui');
    const mobile = window.matchMedia('(max-width:1000px)').matches;
    if (enabled) {
        if (popup.parentElement !== document.body) {
            if (!popup.slkHomeMarker?.parentNode) {
                popup.slkHomeMarker = document.createComment('Slack UI: original prompt dialog position');
                popup.parentNode.insertBefore(popup.slkHomeMarker, popup);
            }
            document.body.appendChild(popup);
        }
        if (mobile) {
            if (popup.classList.contains('drawer-content')) {
                popup.slkHadNativeDrawerClass = true;
                popup.classList.remove('drawer-content');
            }
            if (!popup.classList.contains('slk-prompt-portal')) popup.classList.add('slk-prompt-portal');
            if (popup.classList.contains('slk-nav-hidden')) popup.classList.remove('slk-nav-hidden');
            if (!popup.slkPromptTouchGuard) {
                popup.slkPromptTouchGuard = event => {
                    if (document.body.classList.contains('slk-ui') && matchMedia('(max-width:1000px)').matches) event.stopPropagation();
                };
                for (const type of ['touchstart','mousedown']) popup.addEventListener(type,popup.slkPromptTouchGuard);
            }
        }
    } else if (popup.slkHomeMarker?.parentNode) {
        popup.slkHomeMarker.parentNode.insertBefore(popup, popup.slkHomeMarker);
    }
    if (!enabled || !mobile) {
        if (popup.classList.contains('slk-prompt-portal')) popup.classList.remove('slk-prompt-portal');
        if (popup.slkHadNativeDrawerClass && !popup.classList.contains('drawer-content')) popup.classList.add('drawer-content');
        if (popup.classList.contains('slk-prompt-visible') || popup.style.getPropertyPriority('display') === 'important') {
            popup.style.removeProperty('display');
            popup.classList.remove('slk-prompt-visible');
            if (popup.slkAddedPromptPin) {popup.classList.remove('pinnedOpen');popup.slkAddedPromptPin = false;}
            delete popup.dataset.slkPromptArea;
            if (!popup.classList.contains('openDrawer')) popup.style.display = 'none';
        }
    }
}

// v1.8.23 — Use the actual ST PromptManager lifecycle instead of relying on
// slideDown/slideUp (which conflict with forced display rules on mobile).
// This is a runtime extension-only adapter; native form values, edit/save/reset
// handlers and the desktop implementation remain intact.
// Compute the editor's rectangle against the visual viewport, not its
// previous drawer coordinates. Correct any residual containing-block offset.
function slkPlacePromptEditor(popup) {
    if (!popup?.classList.contains('slk-prompt-portal') || !matchMedia('(max-width:1000px)').matches ||
        !popup.matches('.openDrawer,.slk-prompt-visible')) return;
    const vv = window.visualViewport;
    const css = getComputedStyle(document.body);
    const safeTop = Math.max(0, parseFloat(css.getPropertyValue('--slk-safe-top')) || 0);
    const safeBottom = Math.max(0, parseFloat(css.getPropertyValue('--slk-safe-bottom')) || 0);
    const vw = vv?.width || window.innerWidth;
    const vh = vv?.height || window.innerHeight;
    const width = Math.min(820, vw - 32);
    // Convert page-space visual viewport bounds into the SAME coordinate
    // space as getBoundingClientRect. iOS may pan the layout on textarea
    // focus: offsetTop alone is not a client coordinate on all WebKit builds.
    const rootRect = document.documentElement.getBoundingClientRect();
    const pageTop = vv?.pageTop ?? ((window.scrollY || 0) + (vv?.offsetTop || 0));
    const pageLeft = vv?.pageLeft ?? ((window.scrollX || 0) + (vv?.offsetLeft || 0));
    const viewportTop = rootRect.top + pageTop;
    const viewportLeft = rootRect.left + pageLeft;
    const viewportBottom = viewportTop + vh;
    const focused = popup.contains(document.activeElement) &&
        document.activeElement.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]');
    const normalHeight = Math.max(popup.slkEditorNormalHeight || 0, vh);
    popup.slkEditorNormalHeight = normalHeight;
    const layoutHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    const keyboard = Math.max(normalHeight, layoutHeight) - vh > 80 &&
        (focused || popup.slkEditorKeyboard === true);
    popup.slkEditorKeyboard = keyboard;
    if (popup.hasAttribute('data-slk-keyboard') !== keyboard) popup.toggleAttribute('data-slk-keyboard', keyboard);
    const footer = document.getElementById('slk-mobile-footer');
    const footerRect = footer?.getBoundingClientRect();
    const footerVisible = !keyboard && footerRect && footerRect.height > 0 &&
        getComputedStyle(footer).visibility !== 'hidden' &&
        footerRect.top < viewportBottom && footerRect.bottom > viewportTop;
    // On iOS leave room for the accessory bar if it overlays the reported
    // viewport. The app's own floating footer is irrelevant with the keyboard.
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const keyboardGap = apple && vh >= 300 ? 52 : 12;
    const upper = viewportTop + (keyboard ? 10 : safeTop + 12);
    const lower = Math.min(viewportBottom - (keyboard ? keyboardGap : safeBottom + 12),
        footerVisible ? footerRect.top - 16 : viewportBottom);
    const available = Math.max(1, lower - upper);
    const height = Math.min(600, available);
    const left = viewportLeft + (vw - width) / 2;
    const top = upper + (available - height) / 2;
    const put = (key, n) => {
        const val = `${Math.round(n * 100) / 100}px`;
        if (popup.style.getPropertyValue(key) !== val) popup.style.setProperty(key, val);
    };
    put('--slk-editor-width', width); put('--slk-editor-height', height);
    // Calibrate against the current fixed-position origin, rather than
    // assigning offsetTop and correcting it again. Both measurements are
    // client coordinates, so a visual viewport pan cannot be counted twice.
    const rect = popup.getBoundingClientRect();
    const resolved = getComputedStyle(popup);
    const currentTop = parseFloat(resolved.top);
    const currentLeft = parseFloat(resolved.left);
    put('--slk-editor-top', (Number.isFinite(currentTop) ? currentTop : 0) + top - rect.top);
    put('--slk-editor-left', (Number.isFinite(currentLeft) ? currentLeft : 0) + left - rect.left);
}

// Reveal the focused field once after the keyboard changes the viewport. Do
// not call scrollIntoView (which can pan the background and the whole iOS page),
// and do not keep forcing the scroll position while the user scrolls manually.
function slkRevealPromptField(popup) {
    if (!popup?.matches('.slk-prompt-portal:is(.openDrawer,.slk-prompt-visible)')) return;
    const field = document.activeElement;
    if (!popup.contains(field) || !field.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]')) return;
    const scroller = popup.querySelector('.slk-prompt-form-fields');
    if (!scroller || !scroller.contains(field)) return;
    const r = scroller.getBoundingClientRect();
    const f = field.getBoundingClientRect();
    const top = r.top + 8, bottom = r.bottom - 8;
    // A long textarea need not fit in full. If part of it is already in view,
    // leave native caret/selection and textarea scrolling alone.
    if (field.tagName === 'TEXTAREA' && f.height > bottom - top &&
        f.top <= top && f.bottom >= bottom) return;
    if (f.top < top || f.bottom > bottom) {
        const desired = f.height > bottom - top ? top : Math.max(top, (top + bottom - f.height) / 2);
        scroller.scrollTop += f.top - desired;
    }
}

function slkInstallPromptManagerAdapter(PromptManager) {
    const proto = PromptManager?.prototype;
    if (!proto || proto.slkMobilePromptAdapter || typeof proto.showPopup !== 'function' || typeof proto.hidePopup !== 'function') return;
    const originalShow = proto.showPopup;
    const originalHide = proto.hidePopup;
    const active = manager => manager.configuration?.prefix === 'completion_' &&
        document.body?.classList.contains('slk-ui') && matchMedia('(max-width:1000px)').matches;
    const popupFor = manager => document.getElementById(manager.configuration.prefix + 'prompt_manager_popup');
    const stopNativeAnimation = popup => {
        const jq = window.jQuery;
        if (jq) jq(popup).stop(true, false);
        // jQuery may leave animation dimensions on the element after stop().
        for (const name of ['display','height','width','overflow','overflow-x','overflow-y','padding-top','padding-bottom','margin-top','margin-bottom','opacity']) popup.style.removeProperty(name);
    };
    proto.showPopup = function(area = 'edit') {
        if (!active(this)) return originalShow.apply(this, arguments);
        const popup = popupFor(this);
        const content = document.getElementById(this.configuration.prefix + 'prompt_manager_popup_' + area);
        if (!popup || !content) return originalShow.apply(this, arguments);
        slkPortalPromptEditor(popup);
        stopNativeAnimation(popup);
        popup.hidden = false;
        popup.classList.remove('closedDrawer','displayNone','slk-nav-hidden');
        popup.dataset.slkPromptArea = area;
        popup.slkPromptManager = this;
        content.style.display = 'flex';
        popup.classList.add('openDrawer','slk-prompt-visible');
        // ST's global outside-touch handler otherwise treats the popup as a
        // normal drawer. Only this editor is pinned; close/save still work.
        if (!popup.classList.contains('pinnedOpen')) {popup.classList.add('pinnedOpen');popup.slkAddedPromptPin = true;}
        popup.style.setProperty('display','flex','important');
        slkPlacePromptEditor(popup);
        requestAnimationFrame(() => {
            if (!popup.classList.contains('slk-prompt-visible')) return;
            slkPlacePromptEditor(popup);
            popup.scrollTop = 0;
            popup.querySelector('.slk-prompt-form-fields')?.scrollTo(0,0);
        });
    };
    proto.hidePopup = function() {
        if (!active(this)) return originalHide.apply(this, arguments);
        const popup = popupFor(this);
        if (!popup) return originalHide.apply(this, arguments);
        stopNativeAnimation(popup);
        popup.classList.remove('openDrawer','slk-prompt-visible');
        if (popup.slkAddedPromptPin) {popup.classList.remove('pinnedOpen');popup.slkAddedPromptPin = false;}
        delete popup.dataset.slkPromptArea;
        popup.slkPromptManager = null;
        popup.slkEditorNormalHeight = 0;
        popup.slkEditorKeyboard = false;
        popup.removeAttribute('data-slk-keyboard');
        popup.style.setProperty('display','none','important');
    };
    Object.defineProperty(proto,'slkMobilePromptAdapter',{value:true,configurable:true});
}

// ST already imports this ES module. Import the same canonical URL (no cache
// query) so the existing PromptManager instance sees the prototype adapter.
// Older/custom ST builds fall back to the original observer-based editor.
function slkConnectPromptManager() {
    import(new URL('scripts/PromptManager.js', document.baseURI).href)
        .then(module => slkInstallPromptManagerAdapter(module.PromptManager))
        .catch(error => console.warn('[Slack UI] Native prompt adapter unavailable:', error));
}

// v1.6.3 — Native prompt editing dialog: scrollable fields + persistent,
// clearly labeled action bar. This only moves existing nodes and retains
// SillyTavern's original save/reset/close event listeners and input IDs.
(function slkPolishNativePromptEditor() {
    function prepare() {
        // The native prompt dialog lives inside a drawer. The drawer's positioning
        // and older high-specificity transform resets can make fixed positioning
        // relative to the drawer, cutting off half the editor on small screens.
        // Portal only this dialog to <body>; the original element, IDs, event
        // listeners and SillyTavern save/reset/close actions are preserved.
        if (!document.body.classList.contains('slk-ui')) return;
        slkPortalPromptEditor();
        const editor = document.getElementById('completion_prompt_manager_popup_edit');
        // Keep the heading text inset independent of SillyTavern and external
        // themes overriding H3 padding. Preserve translated title content.
        const heading = editor?.querySelector(':scope > h3');
        if (heading && !heading.querySelector('.slk-prompt-heading-text')) {
            const inner = document.createElement('span');
            inner.className = 'slk-prompt-heading-text';
            while (heading.firstChild) inner.appendChild(heading.firstChild);
            heading.appendChild(inner);
        }
        const form = editor?.querySelector('.completion_prompt_manager_popup_entry_form');
        const footer = form?.querySelector(':scope > .completion_prompt_manager_popup_entry_form_footer');
        if (!form || !footer || form.querySelector(':scope > .slk-prompt-form-fields')) return;

        const fields = document.createElement('div');
        fields.className = 'slk-prompt-form-fields';
        while (form.firstChild && form.firstChild !== footer) {
            fields.appendChild(form.firstChild);
        }
        form.insertBefore(fields, footer);

        for (const [id, label] of [
            ['completion_prompt_manager_popup_entry_form_close', '취소'],
            ['completion_prompt_manager_popup_entry_form_reset', '초기화'],
            ['completion_prompt_manager_popup_entry_form_save', '저장'],
        ]) {
            const button = footer.querySelector('#' + id);
            if (!button) continue;
            button.dataset.slkActionLabel = label;
            button.setAttribute('aria-label', label);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
    else prepare();
    window.addEventListener('slk-ui-settings-changed', prepare);
})();


// v1.7.1 — Native SillyTavern prompt editor: compact, responsive rows.
// Reuses the native inputs and listeners; it does not replace prompt data or save behavior.
(function slkCompactNativePromptEditor() {
    const popupId = 'completion_prompt_manager_popup';
    const prefix = 'completion_prompt_manager_popup_entry_form_';
    const controlSelector = '.completion_prompt_manager_popup_entry_form_control';
    let scheduled = false;
    let popupObserver = null;
    let watchedPopup = null;

    const nativeControl = (fields, suffix, labelPattern) => {
        const input = fields.querySelector('#' + prefix + suffix);
        if (input) return input.closest(controlSelector) || input;
        if (!labelPattern) return null;
        return [...fields.querySelectorAll(controlSelector)].find(node =>
            labelPattern.test(node.querySelector('label')?.textContent?.trim() || '')
        ) || null;
    };
    const blockControl = (fields, blockId, labelPattern) => {
        const block = fields.querySelector('#' + blockId);
        return { block, control: (block?.closest(controlSelector) || block ||
            [...fields.querySelectorAll(controlSelector)].find(node =>
                labelPattern.test(node.querySelector('label')?.textContent?.trim() || '')
            ) || null) };
    };
    const isNativeHidden = (block, control) => [block, control].some(el =>
        el && (el.hidden || el.style.display === 'none' ||
            el.classList.contains('displayNone') || el.classList.contains('hidden'))
    );
    const ensure = (parent, className) => {
        let node = parent.querySelector(':scope > .' + className);
        if (!node) {
            node = document.createElement('div');
            node.className = className;
            parent.appendChild(node);
        }
        return node;
    };
    const moveNative = (node, parent) => {
        if (node && node.parentElement !== parent) parent.appendChild(node);
    };
    // MutationObserver watches class attributes. Writing an unchanged class
    // still generates mutation records on some mobile engines and can loop.
    const setClass = (el, cls, enabled) => {
        if (!el || el.classList.contains(cls) === enabled) return;
        el.classList.toggle(cls, enabled);
    };

    const fix = () => {
        scheduled = false;
        if (!document.body.classList.contains('slk-ui')) return;
        const popup = document.getElementById(popupId);
        // Portal before testing visibility, even if native animation has not
        // finished. For mobile the native openDrawer flag is authoritative.
        if (!popup) return;
        slkPortalPromptEditor(popup);
        if (popup.hidden || popup.classList.contains('displayNone') || !popup.classList.contains('openDrawer')) return;
        const edit = popup.querySelector('#completion_prompt_manager_popup_edit');
        const heading = edit?.querySelector(':scope > h3') || edit?.querySelector('h3');
        const form = edit?.querySelector('.completion_prompt_manager_popup_entry_form');
        const footer = form?.querySelector(':scope > .completion_prompt_manager_popup_entry_form_footer');
        if (!edit || !form || !footer) return;

        // Retain the heading content and give it a real inset, not a visual indent.
        setClass(heading, 'slk-prompt-editor-title', true);
        if (heading && !heading.querySelector(':scope > .slk-prompt-heading-text')) {
            const label = document.createElement('span');
            label.className = 'slk-prompt-heading-text';
            while (heading.firstChild) label.appendChild(heading.firstChild);
            heading.appendChild(label);
        }
        let fields = form.querySelector(':scope > .slk-prompt-form-fields');
        if (!fields) {
            fields = document.createElement('div');
            fields.className = 'slk-prompt-form-fields';
            while (form.firstChild && form.firstChild !== footer) fields.appendChild(form.firstChild);
            form.insertBefore(fields, footer);
        }
        // The title scrolls with the fields, while the native action row is
        // a separate, non-scrolling flex sibling. Do not recreate any inputs.
        if (heading && matchMedia('(max-width:1000px)').matches) {
            if (heading.parentElement !== fields) fields.prepend(heading);
        } else if (heading && heading.parentElement === fields) {
            edit.prepend(heading);
        }
        for (const [suffix, label] of [['close', '취소'], ['reset', '초기화'], ['save', '저장']]) {
            const button = footer.querySelector('#' + prefix + suffix);
            if (button && button.dataset.slkActionLabel !== label) {
                button.dataset.slkActionLabel = label;
                button.setAttribute('aria-label', label);
            }
        }

        const name = nativeControl(fields, 'name', /^(이름|Name)$/i);
        const role = nativeControl(fields, 'role', /^(역할|Role)$/i);
        const triggers = nativeControl(fields, 'injection_trigger', /^Triggers?$/i);
        const position = nativeControl(fields, 'injection_position', /^(위치|Position)$/i);
        const depth = blockControl(fields, 'completion_prompt_manager_depth_block', /^(깊이|Depth)$/i);
        const order = blockControl(fields, 'completion_prompt_manager_order_block', /^(오더|순서|Order)$/i);
        if (!name && !role && !triggers && !position) return;

        let layout = fields.querySelector(':scope > .slk-prompt-layout');
        if (!layout) {
            layout = document.createElement('div');
            layout.className = 'slk-prompt-layout';
            fields.insertBefore(layout, heading?.parentElement === fields ? heading.nextSibling : fields.firstChild);
        }
        const nameRow = ensure(layout, 'slk-prompt-name-row');
        const roleRow = ensure(layout, 'slk-prompt-role-trigger-row');
        const posRow = ensure(layout, 'slk-prompt-position-row');
        for (const [node, parent] of [[name, nameRow], [role, roleRow], [triggers, roleRow],
            [position, posRow], [depth.control, posRow], [order.control, posRow]]) {
            moveNative(node, parent);
        }

        // Set native Depth/Order visibility once per pass below. Previous
        // versions toggled these classes here AND after checking computed
        // styles, causing an endless MutationObserver ping-pong for hidden
        // fields in some SillyTavern configurations.

        // Move ONLY the original prompt control, not its containing source block.
        // SillyTavern/theme source wrappers can have fixed height or padding;
        // moving the wrapper into this flex layout caused a ~150px blank gap.
        // Moving the real control preserves the native input, ID and listeners.
        // SillyTavern also nests this textarea in source wrappers which may
        // reserve 150px even after the visible control moves. Find the actual
        // textarea, keep its original listeners, and always place its control
        // DIRECTLY after Position, not inside any source/sizing wrapper.
        const prompt = fields.querySelector('#' + prefix + 'prompt') ||
            fields.querySelector('textarea[id*="prompt"]') || fields.querySelector('textarea');
        const promptControl = prompt?.closest(controlSelector) || prompt?.parentElement;
        const oldSourceParent = promptControl?.parentElement;
        if (promptControl && ![name, role, triggers, position, depth.control, order.control].includes(promptControl)) {
            setClass(promptControl, 'slk-prompt-content-block', true);
            if (promptControl.previousElementSibling !== posRow || promptControl.parentElement !== layout) {
                posRow.after(promptControl);
            }
        }
        // Retire only the ORPHANED source wrappers that no longer contain
        // any form interaction. They are not deleted, so other native scripts
        // can still address them. This deliberately ignores stale hidden text.
        for (let shell = oldSourceParent; shell && shell !== fields && shell !== layout; shell = shell.parentElement) {
            if (shell.querySelector('input,select,textarea,button,a,[contenteditable="true"],[role="button"]')) break;
            setClass(shell, 'slk-prompt-retired-source', true);
        }
        const promptSource = fields.querySelector('#completion_prompt_manager_popup_entry_source_block');
        if (promptSource && !promptSource.contains(prompt)) {
            const hasInteractive = !!promptSource.querySelector('input,textarea,select,button,a,[role="button"],[contenteditable="true"]');
            setClass(promptSource, 'slk-prompt-retired-source', !hasInteractive);
            if (!hasInteractive) {
                const sourceWrapper = promptSource.closest('.flex-container');
                if (sourceWrapper && fields.contains(sourceWrapper) && !sourceWrapper.querySelector('input,textarea,select,button,a')) {
                    setClass(sourceWrapper, 'slk-prompt-retired-source', true);
                }
            }
        }
        // Older markup occasionally keeps a fixed-height .flex-container row
        // with only labels/whitespace after we move all the real inputs out.
        for (const row of fields.querySelectorAll(':scope > .flex-container, :scope > .flex-container.gap10px')) {
            if (!row.querySelector('input,select,textarea,button,a,[role="button"],[contenteditable="true"]')) {
                setClass(row, 'slk-prompt-retired-source', true);
                setClass(row, 'slk-prompt-empty-native-row', true);
            }
        }
        // Read NATIVE hide state, not a computed 'display:none' created by our
        // own .slk-prompt-native-hidden class. Never toggle off and immediately
        // toggle on in the same frame (that previously caused endless rerenders).
        const positionSelect = fields.querySelector('#' + prefix + 'injection_position');
        const mobileEditor = matchMedia('(max-width:1000px)').matches;
        // Native ST uses visibility:hidden for relative prompts. Invisible
        // grid items still reserve the full height of their long help text.
        const relative = positionSelect && (positionSelect.value === '0' ||
            (positionSelect.value !== '1' && positionSelect.selectedIndex === 0));
        for (const { block: nativeBlock, control } of [depth, order]) {
            if (!control) continue;
            const nativeHidden = isNativeHidden(nativeBlock, control) ||
                (nativeBlock && nativeBlock !== control &&
                 getComputedStyle(nativeBlock).display === 'none');
            const invisible = [nativeBlock, control].some(el => el?.style.visibility === 'hidden');
            setClass(control, 'slk-prompt-native-hidden', Boolean(nativeHidden || (mobileEditor && (relative || invisible))));
        }
        if (mobileEditor && positionSelect) {
            const mode = relative ? 'relative' : 'depth';
            if (posRow.dataset.slkPositionMode !== mode) posRow.dataset.slkPositionMode = mode;
        } else if (posRow.hasAttribute('data-slk-position-mode')) delete posRow.dataset.slkPositionMode;
        setClass(posRow, 'slk-prompt-has-depth', [depth, order].some(({control}) =>
            control && !control.classList.contains('slk-prompt-native-hidden')));

        // Guard against an old theme leaving an invisible reserved row inside
        // Position. If row height exceeds all visible children, cap it to the
        // actual content height. This is a layout correction, not data mutation.
        const visiblePositionControls = [...posRow.children].filter(el =>
            !el.classList.contains('slk-prompt-native-hidden') && getComputedStyle(el).display !== 'none');
        if (matchMedia('(min-width:1001px)').matches && visiblePositionControls.length) {
            const origin = posRow.getBoundingClientRect().top;
            const last = Math.max(...visiblePositionControls.map(el => el.getBoundingClientRect().bottom));
            const targetHeight = Math.max(0, Math.ceil(last - origin));
            const currentCap = posRow.style.getPropertyValue('--slk-prompt-position-content-h');
            if (targetHeight > 0 && (currentCap || posRow.getBoundingClientRect().height - targetHeight > 24)) {
                // Once capped, keep the cap until the contents change; otherwise
                // repeated MutationObserver runs would alternate gap/no-gap.
                const v = `${targetHeight}px`;
                if (currentCap !== v) posRow.style.setProperty('--slk-prompt-position-content-h', v);
            }
        }

        // Make the title line up with the actual Name label even when the host
        // theme offsets the native h3. Avoid redundant style writes: the dialog
        // is watched by a MutationObserver.
        if (heading && name) {
            const inset = Math.max(16, Math.round(name.getBoundingClientRect().left - heading.getBoundingClientRect().left));
            const value = inset + 'px';
            if (heading.style.getPropertyValue('--slk-prompt-title-inset') !== value) {
                heading.style.setProperty('--slk-prompt-title-inset', value);
            }
        }

        // Do not reveal Select2's hidden backing <select> or tamper with its
        // values. Use the existing Select2 widget and its normal events.
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(fix);
    };
    const observePopup = (popup) => {
        if (watchedPopup === popup) return;
        popupObserver?.disconnect();
        watchedPopup = popup;
        slkPortalPromptEditor(popup);
        popupObserver = new MutationObserver(records => {
            // Resolve root stacking immediately in the mutation microtask.
            // Layout work can still be batched to one animation frame.
            if (records.some(r => r.target === popup)) slkPortalPromptEditor(popup);
            schedule();
        });
        popupObserver.observe(popup, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['class', 'style', 'hidden'],
        });
        popup.addEventListener('change', schedule, true);
        popup.addEventListener('click', schedule, true);
        schedule();
    };
    const start = () => {
        const popup = document.getElementById(popupId);
        if (popup) observePopup(popup);
        slkConnectPromptManager();
        const place = () => slkPlacePromptEditor(document.getElementById(popupId));
        let revealFrame = 0;
        const reveal = () => {
            cancelAnimationFrame(revealFrame);
            revealFrame = requestAnimationFrame(() => {
                const current = document.getElementById(popupId);
                slkPlacePromptEditor(current);
                slkRevealPromptField(current);
            });
        };
        const resize = () => {
            place();
            if (document.getElementById(popupId)?.slkEditorKeyboard) reveal();
        };
        window.addEventListener('resize', resize, {passive:true});
        window.visualViewport?.addEventListener('resize', resize, {passive:true});
        window.visualViewport?.addEventListener('scroll', place, {passive:true});
        document.addEventListener('focusin', e => {
            if (e.target.closest?.('#' + popupId)) reveal();
        });
        const panel = document.getElementById('left-nav-panel');
        if (panel) for (const type of ['touchstart','mousedown']) panel.addEventListener(type, event => {
            if (!document.body.classList.contains('slk-ui') || !matchMedia('(max-width:1000px)').matches) return;
            if (event.target.closest?.('.prompt-manager-edit-action,.prompt-manager-inspect-action')) event.stopPropagation();
        });
        if (panel) new MutationObserver(() => {
            const current = document.getElementById(popupId);
            if (current?.classList.contains('slk-prompt-visible') &&
                (!panel.classList.contains('openDrawer') || panel.classList.contains('slk-nav-hidden'))) {
                current.slkPromptManager?.hidePopup();
            }
        }).observe(panel,{attributes:true,attributeFilter:['class']});
        // Retain discovery for late renders/replacements, without observing
        // unrelated attribute changes or re-running layout for other panels.
        const rootObserver = new MutationObserver(records => {
            if (!records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
                node.nodeType === 1 && (node.id === popupId || node.querySelector?.('#' + popupId))))) return;
            const found = document.getElementById(popupId);
            if (found) observePopup(found);
        });
        rootObserver.observe(document.body, { childList: true, subtree: true });
        // init() can enable the body class after this observer is installed.
        let wasEnabled = document.body.classList.contains('slk-ui');
        new MutationObserver(() => {
            const enabled = document.body.classList.contains('slk-ui');
            if (enabled === wasEnabled) return;
            wasEnabled = enabled;
            slkPortalPromptEditor();
            schedule();
        }).observe(document.body, {attributes:true,attributeFilter:['class']});
        // Before ST's own click listener opens the selected prompt, make
        // certain the current node is already outside the settings drawer.
        document.addEventListener('click', event => {
            if (!event.target.closest?.('#completion_prompt_manager, #completion_prompt_manager_list')) return;
            slkPortalPromptEditor();
        }, true);

    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    window.addEventListener('slk-ui-settings-changed', () => {slkPortalPromptEditor();schedule();});
    window.addEventListener('resize', () => {slkPortalPromptEditor();schedule();});
})();


// v1.7.7 — Keep the original Google / Vertex AI edit controls, but place
// the pencil next to the model select field at the same compact square size
// used by the saved-key management button.
(function slkFixModelSelectRow_v177() {
    const targetSelects = ['model_vertexai_select', 'model_google_select'];
    const actionSelector = 'button, .menu_button, .menu_button_icon, [role="button"]';
    const originalPlacement = new WeakMap();
    let queued = false;
    const restoreDesktop = (group, select) => {
        const row = group?.querySelector(':scope > .slk-model-select-row');
        if (!row) return;
        const action = row.querySelector(':scope > .slk-model-edit-action');
        if (action) {
            action.classList.remove('slk-model-edit-action');
            const placement = originalPlacement.get(action);
            if (placement?.beforeSelect && select?.parentElement === group) group.insertBefore(action, select);
            else group.appendChild(action);
        }
        if (select && select.parentElement !== group) group.appendChild(select);
        row.remove();
    };
    const sync = () => {
        queued = false;
        const mobile = document.body?.classList.contains('slk-ui') && window.matchMedia('(max-width: 1000px)').matches;
        for (const id of targetSelects) {
            const select = document.getElementById(id);
            // Once wrapped, the select's immediate parent is our own row.
            // Always resolve its original form group; otherwise every
            // MutationObserver pass creates another row inside the last row.
            const group = select?.parentElement?.classList.contains('slk-model-select-row')
                ? select.parentElement.parentElement : select?.parentElement;
            if (!group) continue;
            if (!mobile) {
                restoreDesktop(group, select);
                continue;
            }
            const heading = group.querySelector(':scope > h4');
            let row = group.querySelector(':scope > .slk-model-select-row');
            if (!row) {
                row = document.createElement('div');
                row.className = 'slk-model-select-row';
                group.insertBefore(row, select);
            }
            if (select.parentElement !== row) row.appendChild(select);
            const siblings = [...group.children];
            const selectIndex = siblings.indexOf(row);
            const siblingAction = siblings.find((el, i) => i >= 0 && (selectIndex < 0 || i <= selectIndex + 1) && el !== row && el.matches?.(actionSelector));
            const inlineAction = heading ? [...heading.children].find(el => el.matches(actionSelector)) : null;
            const action = row.querySelector(':scope > .slk-model-edit-action') || siblingAction || inlineAction;
            if (action) {
                if (!originalPlacement.has(action)) originalPlacement.set(action, { beforeSelect: action.parentElement === group && group.contains(select) && action.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING });
                action.classList.add('slk-model-edit-action');
                if (action.parentElement !== row) row.appendChild(action);
                // Native icon masks can be 16px even when the wrapper says 26px.
                // Draw a single 28px SVG with an explicit 2.5px stroke so the
                // rendered size matches the nearby API-key control on iPhone.
                action.classList.add('slk-model-single-glyph');
                if (!action.querySelector(':scope > .slk-model-edit-glyph-v183')) {
                    const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    glyph.setAttribute('class', 'slk-model-edit-glyph-v183');
                    glyph.setAttribute('viewBox', '0 0 24 24');
                    glyph.setAttribute('width', '20');
                    glyph.setAttribute('height', '20');
                    glyph.setAttribute('fill', 'none');
                    glyph.setAttribute('stroke', 'currentColor');
                    glyph.setAttribute('stroke-width', '1');
                    glyph.setAttribute('stroke-linecap', 'round');
                    glyph.setAttribute('stroke-linejoin', 'round');
                    glyph.setAttribute('aria-hidden', 'true');
                    glyph.innerHTML = '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7"/><path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>';
                    action.appendChild(glyph);
                }
            }
        }
    };
    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(sync);
    };
    const start = () => {
        const root = document.getElementById('openai_api') || document.getElementById('left-nav-panel') || document.body;
        new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
        schedule();
        setTimeout(schedule, 350);
        setTimeout(schedule, 1400);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    window.addEventListener('slk-ui-settings-changed', schedule);
    window.addEventListener('resize', schedule);
})();

// v1.8.33 — Optical vertical alignment of mobile action-button labels.
// Existing icons, controls and native handlers stay in place. Only actual
// text is shifted, including native buttons with anonymous flex text items.
(function slkAlignMobileButtonLabels() {
    const selector = '.menu_button, button, [role="button"], .slk-menu-item, .drawer-opener, #create_dummy_persona, #world_create_button, #af_master_import, #af_master_export, #extensions_details, #third_party_extension_button';
    const roots = '#top-settings-holder .drawer-content, #PersonaManagement, #right-nav-panel, #AdvancedFormatting, #WorldInfo, #rm_api_block, #rm_extensions_block, #left-nav-panel, #user-settings-block, #Backgrounds, dialog.popup .popup-controls, #chat .mes_text, #slk-settings-menu';
    const icon = 'i, svg, img, [class*="fa-"], [class*="icon"], [aria-hidden="true"], input, select, textarea, [role="img"]';
    const pending = new Set();
    let queued = false;
    const mobile = matchMedia('(max-width:1000px)');
    function sync(button) {
        if (!button.isConnected || !button.closest(roots) || button.closest('#slk-header, #slk-tabbar, #completion_prompt_manager_popup, .select2-container, [contenteditable="true"]')) return;
        if (button.closest('#chat .mes_text') && !button.matches('.menu_button,.drawer-opener')) return;
        if (button.matches('input,select,textarea') || button.querySelector('input,select,textarea,button,[role="button"]')) return;
        const direct = [...button.childNodes];
        for (const node of direct) {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                const label = document.createElement('slk-button-label');
                button.insertBefore(label, node);
                label.appendChild(node);
            } else if (node.nodeType === Node.ELEMENT_NODE && node.matches('span,b,strong,small,label,div') && !node.matches(icon) && !node.querySelector(icon) && node.textContent.trim()) {
                if (!node.hasAttribute('data-slk-button-label')) node.setAttribute('data-slk-button-label','');
            }
        }
    }
    function flush() {
        queued = false;
        if (mobile.matches && document.body.classList.contains('slk-ui')) for (const el of pending) sync(el);
        pending.clear();
    }
    function enqueue(root) {
        if (!root) return;
        const el = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
        if (!el) return;
        const button = el.closest(selector);
        if (button) pending.add(button);
        if (root.nodeType === Node.ELEMENT_NODE) root.querySelectorAll(selector).forEach(b => pending.add(b));
        if (!queued) { queued = true; requestAnimationFrame(flush); }
    }
    function start() {
        enqueue(document.body);
        new MutationObserver(records => {
            for (const record of records) {
                if (record.type === 'characterData') enqueue(record.target);
                else {
                    const button = record.target.closest?.(selector);
                    if (button) enqueue(button);
                    for (const node of record.addedNodes) enqueue(node);
                }
            }
        }).observe(document.body, {subtree:true,childList:true,characterData:true});
        mobile.addEventListener?.('change', () => enqueue(document.body));
        window.addEventListener('slk-ui-settings-changed', () => enqueue(document.body));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
})();

} // end enabled-only Slack UI runtime (v1.8.4)


// v1.8.52 — native sort picker; keep ST's existing sorting callback.
(function slkNativeExtensionSort() {
    const selector = 'dialog.popup:has(.extensions_info) .extensions_toolbar';
    let storage, translate;
    const active = () => document.body?.classList.contains('slk-ui');
    const mode = source => {
        try { if (storage) return storage.getItem('extensions_sortByName') === 'true' ? 'name' : 'order'; } catch {}
        return /display name/i.test(source.textContent) ? 'name' : 'order';
    };
    const label = key => {
        try { return translate ? (key === 'name' ? translate`Sort: Display Name` : translate`Sort: Loading Order`).replace(/^Sort:\s*/i, '') : (key === 'name' ? 'Display Name' : 'Loading Order'); }
        catch { return key === 'name' ? 'Display Name' : 'Loading Order'; }
    };
    function enhance(toolbar) {
        // ST creates [update all, update enabled, expander, sort]. Keep the
        // native sort node and its registered callback, but never render it.
        const nativeButtons = [...toolbar.children].filter(el => el.matches('button.menu_button'));
        const source = nativeButtons.find(el => /^Sort:/i.test(el.textContent.trim())) || (nativeButtons.length === 3 ? nativeButtons[2] : null);
        if (!source) return;
        if (!active()) {
            toolbar.querySelector('.slk-native-sort')?.remove();
            toolbar.classList.remove('slk-native-sort-ready');
            source.classList.remove('slk-sort-source');
            return;
        }
        source.classList.add('slk-sort-source');
        toolbar.classList.add('slk-native-sort-ready');
        let wrap = toolbar.querySelector(':scope > .slk-native-sort');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'slk-native-sort';
            wrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h12M4 11h9M4 16h6M19 7v12m-3-3 3 3 3-3"/></svg>';
            const select = document.createElement('select');
            select.className = 'slk-native-sort-select';
            select.setAttribute('aria-label', 'Sort extensions');
            for (const key of ['order','name']) select.add(new Option(label(key), key));
            // Selecting the current option does nothing. Only a different
            // selection invokes the original ST handler exactly once.
            select.addEventListener('change', () => {
                if (select.value !== mode(source)) source.click();
            });
            wrap.appendChild(select);
            toolbar.appendChild(wrap);
        }
        const select = wrap.querySelector('select');
        if (select.value !== mode(source)) select.value = mode(source);
        for (const option of select.options) {
            const text = label(option.value);
            if (option.textContent !== text) option.textContent = text;
        }
    }
    let queued = false;
    function scan() {
        document.querySelectorAll(selector).forEach(enhance);
    }
    function schedule() {
        if (queued) return;
        queued = true;
        queueMicrotask(() => { queued = false; scan(); });
    }
    function start() {
        scan();
        new MutationObserver(records => {
            if (records.some(r => r.target.closest?.('.extensions_toolbar') || [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches?.('dialog.popup,.extensions_info,.extensions_toolbar') || n.querySelector?.('.extensions_toolbar'))))) schedule();
        }).observe(document.documentElement, {childList:true, subtree:true});
        // Optional native account setting and translated labels; no dependency
        // on the import succeeding for the ordinary English toolbar.
        import(new URL('scripts/util/AccountStorage.js', document.baseURI).href).then(m => { storage = m.accountStorage; schedule(); }).catch(() => {});
        import(new URL('scripts/i18n.js', document.baseURI).href).then(m => { translate = m.t; schedule(); }).catch(() => {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
    window.addEventListener('slk-ui-settings-changed', schedule);
    window.addEventListener('pageshow', schedule);
})();

// v1.8.70 — move the existing sampler help anchor into the OpenAI preset title.
// Keep the original node, href and listeners. Restore it when leaving OpenAI.
(function slkAlignPresetHelp() {
    function start() {
        const panel = document.getElementById('left-nav-panel');
        const presets = document.getElementById('respective-presets-block');
        const link = panel?.querySelector('a:has([name="samplerHelpButton"]), a.topRightInset:has(.note-link-span)');
        if (!panel || !presets || !link) return;
        const marker = document.createComment('slk native sampler help position');
        link.before(marker);
        let previousTitle = null, queued = false;
        function sync() {
            queued = false;
            const block = presets.querySelector('#openai_api-presets');
            const title = block?.querySelector('.standoutHeader > strong, .standoutHeader > b, .standoutHeader > h3, .standoutHeader > span:not(.note-link-span)');
            const enabled = document.body.classList.contains('slk-ui');
            const visible = block && !block.hidden && getComputedStyle(block).display !== 'none';
            if (enabled && visible && title) {
                if (previousTitle && previousTitle !== title) previousTitle.classList.remove('slk-preset-help-title');
                previousTitle = title;
                if (!title.classList.contains('slk-preset-help-title')) title.classList.add('slk-preset-help-title');
                if (!link.classList.contains('slk-preset-help')) link.classList.add('slk-preset-help');
                if (link.parentElement !== title) title.append(link);
            } else {
                previousTitle?.classList.remove('slk-preset-help-title');
                previousTitle = null;
                if (link.classList.contains('slk-preset-help')) link.classList.remove('slk-preset-help');
                if (marker.parentNode && link.previousSibling !== marker) marker.after(link);
            }
        }
        function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
        new MutationObserver(schedule).observe(presets, {subtree:true, childList:true, attributes:true, attributeFilter:['style','class','hidden']});
        window.addEventListener('slk-ui-settings-changed', schedule);
        sync();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
})();


// v1.8.74 — Compact mobile page-size labels without changing native option values.
(function slkCompactPagerLabels() {
    const mq = matchMedia('(max-width:1000px)');
    const selector = '#PersonaManagement #persona_pagination_container .paginationjs-size-changer select, #right-nav-panel #rm_print_characters_pagination .paginationjs-size-changer select';
    const originals = new Map();
    let queued = false;
    function sync() {
        queued = false;
        const enabled = document.body?.classList.contains('slk-ui');
        for (const [option, original] of originals) {
            if (!enabled || !option.isConnected || !option.closest('select')?.matches(selector)) {
                if (original === null) option.removeAttribute('label');
                else option.setAttribute('label', original);
                originals.delete(option);
            }
        }
        if (!enabled) return;
        for (const select of document.querySelectorAll(selector)) {
            for (const option of select.options) {
                const original = originals.has(option) ? originals.get(option) : option.getAttribute('label');
                const text = (original ?? option.textContent).trim();
                const match = text.match(/^(\d+)\s*(?:\/.*|[^\d\s].*)?$/u);
                if (!match || text === match[1]) continue;
                if (!originals.has(option)) originals.set(option, original);
                if (option.getAttribute('label') !== match[1]) option.setAttribute('label', match[1]);
            }
        }
    }
    function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
    function start() {
        sync();
        new MutationObserver(records => {
            if (records.some(r => r.target.closest?.('#persona_pagination_container,#rm_print_characters_pagination') || [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches?.('#persona_pagination_container,#rm_print_characters_pagination') || n.querySelector?.('#persona_pagination_container,#rm_print_characters_pagination'))))) schedule();
        }).observe(document.body, {subtree:true,childList:true});
        mq.addEventListener?.('change',schedule);
        window.addEventListener('slk-ui-settings-changed',schedule);
        window.addEventListener('pageshow',schedule);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
})();


// v1.8.76 — Strip only decorative dashes from the lorebook editor placeholder.
// Keep option values, selected book names and all native Select2 events unchanged.
(function slkLorebookEditorPlaceholder() {
    const selector = '#world_editor_select, #select2-world_editor_select-container';
    const clean = text => text.replace(/^\s*[-–—]+\s*|\s*[-–—]+\s*$/gu, '').trim();
    let queued = false;
    function sync() {
        queued = false;
        if (!document.body?.classList.contains('slk-ui')) return;
        const select = document.getElementById('world_editor_select');
        if (!select) return;
        for (const option of select.options) {
            if (option.value !== '') continue;
            const text = option.getAttribute('label') ?? option.textContent;
            const label = clean(text);
            if (label && label !== text.trim()) option.setAttribute('label', label);
        }
        const rendered = document.getElementById('select2-world_editor_select-container');
        if (!rendered) return;
        const placeholder = rendered.querySelector('.select2-selection__placeholder') || (select.value === '' ? rendered : null);
        if (!placeholder) return;
        const text = placeholder.textContent;
        const label = clean(text);
        if (label && label !== text.trim()) {
            // Preserve all child controls / markup, if present.
            const walker = document.createTreeWalker(placeholder, NodeFilter.SHOW_TEXT);
            for (let node; (node = walker.nextNode());) {
                const value = clean(node.nodeValue);
                if (value && value !== node.nodeValue.trim()) node.nodeValue = value;
            }
        }
        for (const el of [placeholder, rendered]) {
            const title = el.getAttribute('title');
            if (title && clean(title) !== title.trim()) el.setAttribute('title', clean(title));
        }
    }
    function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
    function relevant(node) {
        const el = node.nodeType === 1 ? node : node.parentElement;
        return el && (el.closest(selector) || (node.nodeType === 1 && el.querySelector(selector)));
    }
    function start() {
        sync();
        new MutationObserver(records => {
            if (records.some(r => relevant(r.target) || [...r.addedNodes].some(relevant))) schedule();
        }).observe(document.body, {subtree:true,childList:true,characterData:true});
        document.addEventListener('change', e => { if (e.target.id === 'world_editor_select') schedule(); });
        window.addEventListener('slk-ui-settings-changed', schedule);
        window.addEventListener('pageshow', schedule);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
    else start();
})();


// v1.8.77 — Place the existing character actions in the title row, not clones.
// Keep native IDs and direct listeners. Restore their original slots outside list view.
(function slkCharacterHeaderActions() {
    const ids = ['rm_button_create','character_import_button','external_import_button','rm_button_group_chats'];
    let current = null, queued = false;
    function restore() {
        if (!current) return;
        for (const {node, marker} of current.slots) {
            if (marker.isConnected) marker.replaceWith(node);
        }
        current.bar.classList.remove('slk-char-header-sorted');
        current.group.remove(); current = null;
    }
    function sync() {
        queued = false;
        const panel = document.getElementById('right-nav-panel');
        const header = panel?.querySelector('#CharListButtonAndHotSwaps');
        const bar = panel?.querySelector('#rm_characters_block #rm_button_bar');
        const enabled = document.body?.classList.contains('slk-ui') && panel?.dataset.slkView === 'list' && header && bar;
        if (current && (!enabled || current.bar !== bar || current.header !== header || !current.group.isConnected || !current.slots.every(s=>s.marker.isConnected && s.node.isConnected))) restore();
        if (!enabled || current) return;
        const nodes = ids.map(id => bar.querySelector('#'+id));
        if (nodes.some(n=>!n)) return;
        const group = document.createElement('div'); group.className = 'slk-char-header-actions';
        const pills = document.createElement('div'); pills.className = 'slk-char-header-pills';
        const slots = nodes.map(node=>{ const marker = document.createComment('slk-character-action-slot'); node.before(marker); return {node,marker}; });
        group.append(nodes[0],pills); pills.append(...nodes.slice(1));
        header.append(group); bar.classList.add('slk-char-header-sorted');
        current = {header,bar,group,slots};
    }
    function schedule() { if (!queued) { queued = true; requestAnimationFrame(sync); } }
    function start() {
        sync();
        new MutationObserver(records=>{
            if (records.some(r=>r.target === document.body || r.target.closest?.('#right-nav-panel') || [...r.addedNodes].some(n=>n.nodeType===1 && (n.id==='right-nav-panel'||n.querySelector?.('#right-nav-panel'))))) schedule();
        }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-slk-view','class']});
        window.addEventListener('slk-ui-settings-changed',schedule);
        window.addEventListener('pageshow',schedule);
    }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();

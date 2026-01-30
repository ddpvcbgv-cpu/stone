
// App State
const state = {
    step: 0,
    scores: { S: 0, C: 0, T: 0, D: 0, F: 0, E: 0 },
    extendedStep: 0,
    extendedAnswers: {},
    mode: 'normal',
    user: null, // { email, name, provider }
    isLoggedIn: false
};

const dom = {
    container: document.getElementById('content-container'),
    app: document.getElementById('app')
};

// --- Authentication Logic ---
const auth = {
    // Keys for localStorage
    USERS_KEY: 'heartStone_users',
    SESSION_KEY: 'heartStone_session',

    // Initialize: Check for active session
    init: function () {
        const session = localStorage.getItem(this.SESSION_KEY);
        if (session) {
            state.user = JSON.parse(session);
            state.isLoggedIn = true;
            this.updateHeader();
            return true;
        }
        return false;
    },

    // Login (Email or Social)
    login: function (user) {
        state.user = user;
        state.isLoggedIn = true;
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
        this.updateHeader();

        // Load saved progress for this user
        this.loadUserProgress();

        closeModal('login-modal');
        alert(`${user.name}님, 환영합니다!`);

        // Redirect logic: If data exists, go to extended test
        if (state.extendedStep > 0 || Object.keys(state.extendedAnswers).length > 0) {
            if (confirm("이전에 진행하던 검사 기록이 있습니다. 이어서 하시겠습니까?")) {
                startExtendedTest();
            }
        } else {
            // New user: maybe skip intro?
            // For now, let them stay on intro or whatever page they are on.
        }
    },

    // Signup (Email)
    signup: function (name, email, password) {
        const users = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
        if (users.find(u => u.email === email)) {
            alert('이미 가입된 이메일입니다.');
            return false;
        }

        const newUser = { name, email, password, provider: 'email' };
        users.push(newUser);
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));

        alert('가입이 완료되었습니다! 로그인해주세요.');
        switchModal('login');
        return true;
    },

    // Logout
    logout: function () {
        if (confirm("로그아웃 하시겠습니까?")) {
            localStorage.removeItem(this.SESSION_KEY);
            state.user = null;
            state.isLoggedIn = false;

            // Reset state
            state.extendedStep = 0;
            state.extendedAnswers = {};

            this.updateHeader();
            alert("로그아웃 되었습니다.");
            location.reload();
        }
    },

    // Update Header UI
    updateHeader: function () {
        const btn = document.getElementById('auth-btn');
        if (state.isLoggedIn) {
            btn.textContent = `마이페이지 (${state.user.name})`;
            btn.onclick = () => {
                // Simple My Page Action: Show Logout for MVP
                // Ideally this opens a dropdown or My Page modal
                auth.logout();
            };
        } else {
            btn.textContent = `로그인 / 회원가입`;
            btn.onclick = openLoginModal;
        }
    },

    // Save Progress (Auto-save)
    saveUserProgress: function () {
        if (!state.isLoggedIn) return;
        const key = `heartStone_progress_${state.user.email}`;
        const data = {
            extendedStep: state.extendedStep,
            extendedAnswers: state.extendedAnswers
        };
        localStorage.setItem(key, JSON.stringify(data));
    },

    // Load Progress
    loadUserProgress: function () {
        if (!state.isLoggedIn) return;
        const key = `heartStone_progress_${state.user.email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            const data = JSON.parse(saved);
            state.extendedStep = data.extendedStep || 0;
            state.extendedAnswers = data.extendedAnswers || {};
        }
    }
};

// --- Modal Helpers ---
function openLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function switchModal(target) {
    if (target === 'signup') {
        closeModal('login-modal');
        document.getElementById('signup-modal').classList.remove('hidden');
    } else {
        closeModal('signup-modal');
        document.getElementById('login-modal').classList.remove('hidden');
    }
}

// --- Auth Handlers ---
function handleSocialLogin(provider) {
    // Mock Social Login
    const mockUser = {
        name: `${provider} 사용자`,
        email: `user@${provider.toLowerCase()}.com`,
        provider: provider
    };
    auth.login(mockUser);
}

function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Check against mock DB
    const users = JSON.parse(localStorage.getItem(auth.USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        auth.login({ name: user.name, email: user.email, provider: 'email' });
    } else {
        alert('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
}

function handleEmailSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    auth.signup(name, email, password);
}


// --- Initialization ---
function init() {
    auth.init(); // Check session on load
    renderIntro(0);
    dom.container.addEventListener('click', handleIntroClick);
}

function handleIntroClick() {
    if (state.step < 3) {
        state.step++;
        renderIntro(state.step);
    } else if (state.step === 3) {
        state.step++;
        dom.container.removeEventListener('click', handleIntroClick);
        renderQuestion(0);
    }
}

function renderIntro(index) {
    if (!DATA.intro[index]) return;
    const content = DATA.intro[index];
    dom.container.innerHTML = `
        <div class="intro-text fade-in">
            ${content.image ? `<img src="${content.image}" class="intro-image" alt="Intro Illustration">` : ''}
            <h2>${content.text}</h2>
        </div>
        <p style="margin-top: 3rem; font-size: 0.8rem; opacity: 0.5; animation: blink 2s infinite;">(화면을 터치하여 넘기기)</p>
    `;
}

function renderQuestion(qIndex) {
    const question = DATA.questions[qIndex];
    if (!question) {
        calculateAndShowResult();
        return;
    }
    const html = `
        <div class="question-container slide-up">
            <div class="question-header">
                <h3 class="question-title">${question.title}</h3>
                <p class="question-subtitle">${question.subtitle}</p>
            </div>
            <div class="option-list">
                ${question.options.map((opt, idx) => `
                    <button class="option-btn" id="q${qIndex}-opt${idx}" onclick="handleAnswer('${question.id}', ${opt.value})">
                        ${idx + 1}. ${opt.text}
                    </button>
                `).join('')}
            </div>
             ${qIndex > 0 ? `<button onclick="goBack()" style="margin-top: 2rem; background:none; border:none; color: #94a3b8; cursor: pointer;">← 뒤로가기</button>` : ''}
        </div>
    `;
    dom.container.innerHTML = html;

    // Force blur any active element to prevent state persistence
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

function handleAnswer(type, value) {
    state.scores[type] = value;
    state.step++;

    // Remove focus from clicked button
    if (document.activeElement) {
        document.activeElement.blur();
    }

    setTimeout(() => {
        renderQuestion(state.step - 4);
    }, 200);
}

function goBack() {
    if (state.step > 4) {
        state.step--;
        renderQuestion(state.step - 4);
    }
}

// --- Basic Result Logic (Preserved) ---
function calculateResult() {
    const { S, C, T, D, F, E } = state.scores;
    const L = S + C;
    let type = null;
    if (F >= 4 && F >= D) type = 4;
    else if (D >= 4 && D > F) type = 3;
    else if (D >= 4 && F >= 4 && D === F) type = 3;
    else {
        if (L >= 7) type = 1;
        else if (T >= 4) type = 2;
    }
    if (E === 5 && C >= 3) type = 5;
    else if ((E === 3 || E === 4) && C >= 3) type = 6;
    if (type === null) {
        if (E === 5) type = 5;
        else if (E === 3 || E === 4) type = 6;
        else {
            if (L >= 5) type = 1;
            else type = 2;
        }
    }
    return { type, tags: generateTags(S, C, T, D, F, E) };
}

function generateTags(S, C, T, D, F, E) {
    const tags = [];
    if (S >= 4) tags.push("부담-양 많음");
    if (C >= 4) tags.push("유지 어려움");
    if (T >= 4) tags.push("자극 민감");
    if (D >= 4) tags.push("조건 난이도 높음");
    if (F >= 4) tags.push("변동성 높음");
    if (E === 5) tags.push("긴장/분노 기어");
    else if (E === 3) tags.push("무표정 기어");
    else if (E === 4) tags.push("가라앉음 기어");
    return tags.slice(0, 3);
}

function calculateAndShowResult() {
    const { type, tags } = calculateResult();
    const resultData = DATA.results[type];
    const html = `
        <div class="result-card slide-up">
            <div class="result-header">
                <p style="color: #94a3b8; font-size: 0.9rem;">당신의 마음 상태 분석 결과</p>
                <h2 class="type-name">${resultData.name}</h2>
                ${resultData.image ? `<img src="${resultData.image}" class="result-image" alt="${resultData.name}">` : ''}
                <p class="one-liner">"${resultData.oneliner}"</p>
                <div class="tag-container">${tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>
            </div>
            <div class="result-body">
                <p>${resultData.description}</p>
                <h4 class="section-title">🚨 지속되면</h4>
                <ul class="symptom-list">${resultData.symptoms.map(s => `<li>${s}</li>`).join('')}</ul>
                <h4 class="section-title">💊 바로 할 수 있는 행동</h4>
                <ul class="advice-list">${resultData.advice.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>
            <button class="cta-btn" onclick="startExtendedTest()">더 구체적인 마인드 인바디 검사하기</button>
             <button onclick="location.reload()" style="width:100%; margin-top:1rem; background:none; border:none; color: #94a3b8; cursor: pointer; padding: 1rem;">처음으로 돌아가기</button>
        </div>
    `;
    dom.container.innerHTML = html;
}

// --- Extended Test Logic ---
function startExtendedTest() {
    document.body.style.overflow = "auto";
    document.body.style.alignItems = "flex-start";
    dom.container.style.maxWidth = "800px";

    // Load progress if logged in, otherwise reset/keep logic
    if (state.isLoggedIn) {
        auth.loadUserProgress();
    } else {
        // Only reset if not logged in (anonymous mostly starts fresh or keeps session session state?)
        // For MVP, if not logged in, we reset to be safe or maybe keep it.
        // Let's keep existing logic: reset if fresh start is requested.
        // But `startExtendedTest` implies starting. 
        // If we want resume capability from result page, we should check there.
        // For simplified logic: Just let `state` be what it is.
        if (state.extendedStep === 0 && Object.keys(state.extendedAnswers).length === 0) {
            resetExtendedState();
        }
    }

    state.mode = 'extended';
    renderExtendedPage();
}

function resetExtendedState() {
    state.extendedStep = 0;
    state.extendedAnswers = {};
    // Do NOT clear localStorage for user here, only when they explicitly restart?
    // Actually, removal from storage happens on completion or explicit reset.
    // prompt user? 
}

function renderExtendedPage(scrollTop = true) {
    const questionsPerPage = 10;
    const startIndex = state.extendedStep * questionsPerPage;
    const currentQuestions = DATA.extended_questions.slice(startIndex, startIndex + questionsPerPage);
    const totalPages = Math.ceil(DATA.extended_questions.length / questionsPerPage);

    if (currentQuestions.length === 0) {
        showAnalysisLoading();
        return;
    }

    let html = `
        <div class="question-container slide-up">
            <h2 style="margin-bottom: 2rem; text-align:center;">마인드 인바디 정밀 검사 (${state.extendedStep + 1}/${totalPages})</h2>
            <div style="margin-bottom: 2rem; width: 100%; background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px;">
                <div style="width: ${((state.extendedStep) / totalPages) * 100}%; height: 100%; background: var(--accent-color); transition: width 0.3s;"></div>
            </div>
    `;

    currentQuestions.forEach((q, idx) => {
        const globalIdx = startIndex + idx + 1;
        const savedValue = state.extendedAnswers[q.id] || "";
        html += `<div class="extended-question-item" style="margin-bottom: 2.5rem;"><h3 style="font-size: 1.1rem; margin-bottom: 1rem; color: #e2e8f0;">${globalIdx}. ${q.question}</h3>`;
        if (q.type === 'choice') {
            html += `<div class="extended-options" style="display: flex; flex-direction: column; gap: 0.5rem;" id="options-${q.id}">`;
            q.options.forEach(opt => {
                const isSelected = savedValue === opt;
                const style = isSelected
                    ? 'padding: 1rem; text-align: left; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; color: #0f172a; transition: all 0.2s; background: var(--accent-color); font-weight: bold;'
                    : 'padding: 1rem; text-align: left; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; color: var(--text-color); transition: all 0.2s; background: rgba(255,255,255,0.05);';
                html += `<button class="extended-option-btn-${q.id}" data-val="${opt.replace(/"/g, '&quot;')}" onclick="handleExtendedChoice(${q.id}, this)" style="${style}">${opt}</button>`;
            });
            html += `</div>`;
        } else {
            html += `<textarea oninput="handleExtendedText(${q.id}, this.value)" placeholder="내용을 입력해 주세요..." style="width: 100%; height: 100px; padding: 1rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; resize: vertical;">${savedValue}</textarea>`;
        }
        html += `</div>`;
    });

    html += `
        <div style="display: flex; justify-content: space-between; margin-top: 3rem;">
            ${state.extendedStep > 0 ? `<button onclick="prevExtendedPage()" style="padding: 1rem 2rem; background: rgba(255,255,255,0.1); border:none; color: white; border-radius: 8px; cursor: pointer;">이전</button>` : '<div></div>'}
            <button onclick="nextExtendedPage()" style="padding: 1rem 3rem; background: var(--accent-color); border:none; color: #0f172a; border-radius: 8px; font-weight: bold; cursor: pointer;">
                ${state.extendedStep === totalPages - 1 ? '분석 요청하기' : '다음 단계로 저장'}
            </button>
        </div>
        </div>
    `;
    dom.container.innerHTML = html;
    if (scrollTop) window.scrollTo(0, 0);
}

function handleExtendedChoice(qId, btnElement) {
    const value = btnElement.getAttribute('data-val');
    state.extendedAnswers[qId] = value;
    auth.saveUserProgress(); // Auto-save
    const buttons = document.getElementsByClassName(`extended-option-btn-${qId}`);
    for (let btn of buttons) {
        if (btn === btnElement) {
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#0f172a';
            btn.style.fontWeight = 'bold';
        } else {
            btn.style.background = 'rgba(255,255,255,0.05)';
            btn.style.color = 'var(--text-color)';
            btn.style.fontWeight = 'normal';
        }
    }
}

function handleExtendedText(qId, value) {
    state.extendedAnswers[qId] = value;
    auth.saveUserProgress(); // Auto-save
}

function nextExtendedPage() {
    state.extendedStep++;
    auth.saveUserProgress(); // Auto-save step
    const questionsPerPage = 10;
    const totalPages = Math.ceil(DATA.extended_questions.length / questionsPerPage);
    if (state.extendedStep >= totalPages) submitExtendedTest();
    else renderExtendedPage();
}

function prevExtendedPage() {
    if (state.extendedStep > 0) {
        state.extendedStep--;
        renderExtendedPage();
    }
}

function showAnalysisLoading() {
    dom.container.innerHTML = `
        <div class="fade-in" style="text-align: center; padding: 4rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 2rem;">🧠</div>
            <h2 style="margin-bottom: 1rem;">마인드 인바디 분석 중...</h2>
            <p style="line-height: 1.6;">50가지 답변을 바탕으로<br>당신의 '오늘의 돌'과 '건너야 할 강'을 분석하고 있습니다.</p>
            <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 3rem; opacity: 0.8;">(잠시만 기다려주세요, AI가 에세이를 작성 중입니다)</p>
        </div>
    `;
}

function submitExtendedTest() {
    showAnalysisLoading();
    setTimeout(() => {
        showEssayResult();
    }, 3000);
}

// --- FULL VERBATIM MOCK RESULT ---
const MOCK_RESULT = {
    essay: {
        title: "Ⅰ. 오늘의 돌, 오늘의 강",
        intro: `당신의 마음에는 요즘 “돌”이 하나 있어요. 버려야 할 짐이 아니라, 강을 건너는 동안 중심을 잡아주는 추에 가까운 돌. 그래서 이 글은 “돌을 없애자”가 아니라, 돌을 안고도 넘어지지 않는 근력을 만드는 쪽으로 씁니다.<br><br>
        당신은 아침에 눈을 뜨면 가장 먼저 해야 할 일과 일정이 떠오르는 편이에요. 이건 책임감이 강하다는 뜻이기도 하지만, 동시에 “오늘도 무너지지 않으려면 먼저 구조를 잡아야 한다”는 몸의 본능이기도 해요. 강을 건너기 전, 발 디딜 곳부터 찾는 사람처럼요.`,
        sections: [
            {
                title: "1) 돌의 무게: “얼마나” 무거운가",
                content: `당신의 돌은 무게만으로 설명되지 않아요. 아이디어도 많고, 하고 싶은 프로젝트도 분명하고, 사람의 마음을 향한 연민도 크죠. 그런데 그 모든 것이 동시에 올라올 때, 돌은 커져요.<br><br>
                특히 “내가 한 일이 누군가에게 도움이 되거나 의미가 있다고 느꼈을 때” 가장 살아나는 사람은, 반대로 말하면 의미를 잃는 순간 힘이 급격히 빠지기도 해요. 돌이 무거워서가 아니라, “왜 드는지”가 흐려질 때 흔들리는 거죠.`
            },
            {
                title: "2) 그립과 컨트롤: 내가 다룰 수 있다는 감각",
                content: `당신은 원래 조용히 관찰하며 자리를 잡는 타입이에요. 낯선 곳에서 먼저 분위기를 읽고 천천히 들어가죠. 이건 소심함이 아니라, 당신만의 “그립(잡는 방식)”이에요.<br><br>
                문제는 컨트롤이 무너질 때입니다. “해야 할 일은 많은데 구조나 우선순위가 없는 상태”가 오면, 돌은 갑자기 커진 것처럼 느껴져요. 돌의 무게가 늘어난 게 아니라, 잡을 손잡이가 사라진 상태예요.`
            },
            {
                title: "3) 강의 깊이·유속: 상황 난이도와 변동성",
                content: `당신은 현실에서도 강을 건넙니다. 일, 사이드 프로젝트, 사람 관계, 성과 압박. 깊이는 깊고, 유속은 때때로 빨라요. 특히 “중요한 사람에게서 신경 쓰지 않는 것 같은 반응”을 느낄 때, 강의 물살이 갑자기 세져요.<br>
                그 순간 당신의 마음은 말합니다. “내가 잘못했나?” “내가 더 해야 하나?”<br>
                그리고 그 질문이 곧 돌을 더 무겁게 만들어요.`
            },
            {
                title: "4) 기본 표정: 내 마음이 켜두는 기어",
                content: `당신의 기본 정서는 “복합적인 피로감 + 희미한 기대감”이 섞여 있어요. 지쳐 있는데도, 여전히 “그래도 한 번 더 해보자”라고 말하는 사람.<br>
                이건 능력이 아니라 기질에 가까워요. 버티는 근육이 이미 발달한 사람. 다만 지금 필요한 건 근육을 더 키우는 게 아니라, 근육이 경직되지 않도록 풀어주는 기술이에요.`
            }
        ],
        part2: {
            title: "Ⅱ. 마음이 먼저 닿는 곳",
            intro: `당신은 무언가를 선택할 때, “좋아 보인다”보다 진짜 끌리는지, 의미가 있는지를 먼저 확인해요. 그래서 당신의 마음은 화려함보다 “진정성”에 반응합니다.<br>
            “너는 진짜 너답게 살아가는 것 같아.”<br>
            이 문장에 흔들리는 이유는, 당신이 늘 그 질문을 품고 있기 때문이에요. 나는 나답게 살고 있나?`,
            sections: [
                {
                    title: "1) 아침 첫 생각의 방향: 일정이 먼저 뜨는 마음",
                    content: `일정이 먼저 떠오르는 아침은, 나쁜 아침이 아니에요. 다만 그 아침이 매일 반복될 때, 마음은 “나를 위한 시간”보다 “일을 위한 나”로 기울어져요.<br>
                    그러면 당신은 밤 늦게—모두가 잠들어갈 즈음—겨우 숨을 쉬죠. 당신의 골든타임이 밤이라는 건, 낮에 너무 많은 것을 들어올리고 있다는 신호이기도 해요.`
                },
                {
                    title: "2) 낯선 공간에서의 몸의 선택: 관찰과 느린 개방",
                    content: `당신은 겉으로는 편해 보여도 마음을 여는 데 시간이 걸립니다. 이 느림은 결함이 아니에요. 당신에게 관계는 “가벼운 인사”가 아니라 신뢰가 쌓이는 구조물이거든요.<br>
                    그래서 당신은 빠르게 친해지기보다, 천천히 관찰하고, 안전하다고 느낄 때 더 깊게 들어가요. 그 깊이가 생기면, 당신은 사람들과 깊은 대화를 나누다가 시간 가는 줄 모르는 사람이 됩니다.`
                },
                {
                    title: "3) 에너지가 새는 환경: 자극보다 ‘정리되지 않은 상태’",
                    content: `당신은 자극에 쉽게 닳는 타입이라기보다, 정리가 안 된 상태에서 소모되는 타입이에요.<br>
                    해야 할 일은 많은데 구조가 없을 때, 마음이 복잡함과 혼란으로 변해요. 생각은 많은데 정리가 잘 안 되는 감정.<br>
                    이때 당신의 몸은 신호를 보냅니다. 깊게 쉬질 못하고, 목과 어깨가 뻐근하고, 호흡이 가벼워지고, 작은 일에도 심장이 빨라지는 느낌.<br>
                    이건 “약해졌다”가 아니라, 긴장이 오래 누적된 몸의 정직한 보고서예요.`
                }
            ]
        },
        part3: {
            title: "Ⅲ. 무너질 때의 자동 반응",
            intro: `당신의 마음이 흔들릴 때, 첫 이미지는 안개와 바람에 가까워요. 뚜렷하진 않지만 불안하고 흔들리는 느낌. 그 다음에 오는 건 복잡함과 혼란.<br>
            여기서 중요한 건 “당신이 어떤 사람이라서”가 아니라, 당신의 자동반응이 어떻게 작동하는지를 아는 거예요. 그걸 알면, 강이 세질 때도 ‘넘어지기 전 손잡이’를 잡을 수 있어요.`,
            sections: [
                {
                    title: "1) 무너짐의 트리거: 무심함, 기준, 그리고 ‘내가 쓸모없어질까 봐’",
                    content: `당신이 정말로 흔들리는 순간은 “무시당했다”라기보다, 중요한 관계에서 신경 쓰지 않는 듯한 반응을 느낄 때예요.<br>
                    그때 마음속에서 오래된 두려움이 올라옵니다.<br>
                    “내가 부족한가?” “내가 멈추면 쓸모없어지나?”<br>
                    그래서 당신은 더 잘하려고 합니다. “조금만 더 잘해보자.”<br>
                    그 결과, 어느 순간 스스로를 너무 몰아붙이고, 휴식 타이밍을 놓치고, 갑자기 에너지가 확 떨어지는 번아웃이 찾아옵니다. 이 패턴을 당신은 이미 알고 있어요. 중요한 건, 알고도 반복되는 이유를 다정하게 이해하는 거예요.`
                },
                {
                    title: "2) 첫 반사 행동: 고립 → 울음 → 정리",
                    content: `당신은 무너지면 먼저 말이 줄어요. “아무 말도 하기 싫어져 혼자 조용히 시간을 끌며 버티는” 쪽으로 갑니다.<br>
                    그리고 혼자 있을 때까지 기다렸다가, 그때 울죠.<br>
                    이 흐름은 나쁜 흐름이 아닙니다. 다만 “울기까지 너무 오래 버티는 것”이 문제예요.<br>
                    당신은 감정을 억누르면 무력감과 냉소가 커진다는 걸 알고 있어요. 그러면 세상이 의미 없어 보이고, 노력마저 비꼬고 싶은 마음이 스멀스멀 올라오죠. 그건 당신의 본심이 아니라, 표현되지 못한 감정의 뒤틀림입니다.`
                },
                {
                    title: "3) 이상한 위로 습관의 정체: ‘통제감 회복’",
                    content: `당신이 혼자 있을 때 하는 위로 습관—예전 메모/노트를 훑고, 노래를 반복해서 듣고, JSON 구조나 리스트로 생각을 정리하는 것—이건 회피가 아니라 통제감 회복 행동이에요.<br>
                    강에서 발이 미끄러졌을 때, 잠깐 바위에 손을 얹고 자세를 다시 잡는 것. 정리한다는 행위는 당신에게 “나는 다시 중심을 잡을 수 있어”라는 가느다란 확신을 줍니다.<br>
                    그러니 이 습관을 부끄러워할 필요가 없어요. 대신 한 가지가 필요합니다.<br>
                    정리를 ‘밤의 구급처치’로만 쓰지 말고, 낮에도 작은 단위로 나눠 쓰는 것.<br>
                    그러면 무너지기 전에 균형을 잡을 수 있어요.`
                }
            ]
        },
        part4: {
            title: "Ⅳ. 관계에서 드는 돌",
            intro: `당신은 관계 안에서 자주 “역할”을 맡습니다. 늘 이야기를 들어주고 공감해주는 사람, 아이디어를 많이 내고 새롭게 시도해보자고 제안하는 사람.<br>
            이 역할은 당신의 장점이지만, 동시에 돌이 되기도 해요.`,
            sections: [
                {
                    title: "1) 도움을 받을 때의 마음: 고마움이 곧 부담으로 바뀌는 구조",
                    content: `당신은 누군가가 도와주면 고맙지만, 동시에 “나도 꼭 돌려줘야 한다”는 마음이 무거워져요.<br>
                    이건 당신이 계산적인 사람이어서가 아니라, 관계를 소중히 여기는 방식이 너무 성실하기 때문이에요.<br>
                    그런데 여기엔 함정이 있어요.<br>
                    ‘교환’이 관계의 기본 규칙이 되면, 당신은 늘 부족한 사람이 됩니다.<br>
                    받았으니 돌려줘야 하고, 돌려줬으니 또 잘해야 하고… 그 과정에서 관계는 따뜻함보다 의무가 돼요.<br><br>
                    여기서 당신에게 필요한 훈련은 아주 단순합니다.<br>
                    “고마워” 다음 문장 하나를 바꾸는 것.<br><br>
                    (기존) “나도 뭔가 꼭 돌려줘야 해.”<br><br>
                    (훈련) “고마워. 오늘은 내가 받는 날이네.”<br>
                    받는 날을 인정하는 순간, 관계는 다시 숨을 쉽니다.`
                },
                {
                    title: "2) 당신이 정말 원하는 관계의 형태",
                    content: `당신이 바라는 세계는 명확해요.<br><br>
                    진심이 오가는 몇몇 사람과 깊이 연결된 따뜻한 관계<br><br>
                    모두가 느슨하지만 서로 챙겨주는 작은 공동체<br><br>
                    서로를 평가하는 말은 줄이고, 경험을 나누는 말은 넉넉한 곳<br><br>
                    조급함을 강요하지 않는 세계<br><br>
                    당신은 그 세계를 “꿈”으로 말하지만, 사실 이미 당신의 삶에 부분적으로 존재해요.<br>
                    당신이 누군가에게 “같이 밥 먹으면서 얘기할래?”라고 일상적인 자리를 만들어주는 순간, 당신은 이미 작은 공동체를 만들고 있습니다.<br>
                    당신의 재능은 거창한 연설이 아니라, 사람이 숨을 쉴 수 있는 장면을 만들어주는 것이에요.`
                }
            ]
        },
        part5: {
            title: "Ⅴ. 나를 만든 장면들",
            intro: `당신은 어릴 때부터 사람과 장면을 유심히 보며 마음속으로 기획하던 아이였어요. 말이 많진 않았지만, “어떻게 하면 모두가 같이 놀 수 있을지”를 계속 생각하던 아이.<br>
            그때부터 이미 두 가지가 자라났습니다.<br><br>
            사람을 관찰하는 감수성<br><br>
            장면을 설계하는 기획력<br><br>
            그리고 대학 시절 ‘하마하마’를 만들며, “내가 만든 장면이 누군가를 연결하고 웃게 할 수 있다”는 감각을 몸으로 배웠죠. 전시 공간에서 일하며 그 감각이 직업이 되었고, 팟캐스트/유튜브로 평범한 사람의 이야기가 누군가에게 위로가 되는 경험도 했습니다.<br><br>
            하지만 동시에 번아웃의 시기도 있었어요. 너무 무리해서 달리다가 무너진 시기. 그 질문이 남겼죠.<br>
            “나는 무엇을 위해 이렇게까지 하는가?” “진짜 지키고 싶은 건 뭐지?”<br>
            이 질문이 당신을 더 인간 중심으로 방향을 틀게 했어요. 그러니까 당신은 실패한 게 아니라, 방향을 다시 잡는 법을 배운 사람이에요.`,
            sections: [
                {
                    title: "1) NO였는데 YES라고 했던 날의 진짜 이유",
                    content: `당신은 “좋은 사람이고 싶다”는 마음이 큽니다. 거절했을 때 상대가 섭섭해하지 않을까, 신뢰가 줄어들지 않을까 걱정해요.<br>
                    또 한편으로는 “기회는 다시 안 올지도 모른다”는 불안이 있어요.<br>
                    그래서 마음은 NO인데 입은 YES를 말해요.<br>
                    이때 돌이 무거워지는 이유는 단 하나입니다.<br>
                    내 손에 이미 돌이 가득한데도, 또 돌을 받기 때문이에요.<br><br>
                    여기서 필요한 건 용기보다 기술이에요.<br>
                    거절이 어려울 땐, 완전한 NO 대신 “지연”을 쓰면 됩니다.<br><br>
                    “지금은 어렵고, 내일 답할게.”<br><br>
                    “생각해보고 알려줄게.”<br>
                    이 문장 하나가 당신의 강에서, 미끄러지지 않게 해주는 디딤돌이 됩니다.`
                },
                {
                    title: "2) “나는 원래 이런 사람”이라는 방어막",
                    content: `당신이 말한 것처럼, “원래 그렇다” 뒤에는 사정과 두려움이 숨어 있어요.<br>
                    감성적인 건 상처를 잘 받기 때문이고, 새로운 걸 좋아하는 건 의미 없이 흘러갈까 두렵기 때문이고, 책임감이 강한 건 쓸모없어질까 불안하기 때문이에요.<br>
                    그러니까 당신의 성격은 ‘고정된 운명’이 아니라, 당신이 당신을 지키기 위해 만들어온 전략들이에요.<br>
                    전략은 바꿀 수 있습니다.<br>
                    바꾼다는 건 성격을 바꾼다는 게 아니라, 강이 세질 때 쓰는 손동작을 바꾸는 것이에요.`
                }
            ]
        },
        part6: {
            title: "Ⅵ. 지키고 싶은 것과, 가고 싶은 곳",
            intro: `당신이 미래의 나에게 선물하고 싶은 하루는 선명합니다.<br>
            알림에서 멀어진 아침, 햇빛 드는 공간에서 글 쓰고 정리하는 시간, 편한 사람들과 느긋한 점심, 산책이나 가벼운 등산, 저녁엔 “이만하면 잘 살아왔다”고 스스로를 칭찬하는 하루.<br>
            이건 사치가 아니라, 당신에게 필요한 회복 루틴의 설계도예요.<br><br>
            당신이 끝까지 포기하지 않으려는 건 “하고 싶은 일과 꿈”입니다. 그리고 “진심이 오가는 관계”입니다. 당신은 결국 사람들의 이야기를 잘 정리해서 다시 돌려주고 싶어 해요.<br>
            그게 당신이 세상에 기여하고 싶은 방식이고, 당신의 재능이에요.<br>
            사람의 단어뿐 아니라 분위기와 망설임까지 함께 듣고, 그것을 구조와 장면으로 엮어내는 능력.<br><br>
            그래서 당신이 남기고 싶은 한 문장도 너무 당신답습니다.<br>
            “그 사람 덕분에 내 이야기가 조금 더 소중하게 느껴졌어.”<br>
            당신은 누군가의 삶을 ‘작품’처럼 보게 만드는 사람이고, 그건 정말 흔치 않은 능력입니다.`,
            sections: []
        },
        conclusion: {
            title: "마지막: 오늘의 근력 선언 (당신을 위한 짧은 처방)",
            intro: `이 에세이는 결론을 “더 열심히”로 끝내지 않겠습니다. 당신은 이미 충분히 열심히 했어요.<br>
            오늘 필요한 건 ‘추가’가 아니라 ‘정렬’입니다.`,
            items: [
                `<b>1) 오늘의 돌을 한 문장으로 이름 붙이기</b><br>오늘의 돌은 무엇인가요?<br>“책임”인가요, “기대”인가요, “불안”인가요, “미래”인가요?<br>이름을 붙이면, 돌은 덜 무섭습니다.`,
                `<b>2) 돌을 들어올리는 방식 1가지 바꾸기</b><br>오늘 한 번만 이렇게 해보세요.<br>“지금은 어려워, 내일 답할게.”<br>“생각해보고 알려줄게.”<br>이건 관계를 망치는 말이 아니라, 관계를 오래 가게 하는 말이에요.`,
                `<b>3) 강이 세질 때, ‘정리’를 밤이 아니라 낮에 3분만</b><br>당신에게 정리는 통제감 회복이에요.<br>밤에만 하지 말고, 낮에 3분만.<br>오늘 해야 할 일 3개만 적고<br>그중 “지금 당장 5분짜리 1개”만 고르기<br>이게 당신의 강에서 균형을 잡는 가장 현실적인 기술입니다.`,
                `<b>4) 스스로에게 가장 먼저 건넬 문장</b><br>당신이 이미 알고 있는 그 문장.<br>“그래도 여기까지 잘 버텼다.”<br>그리고 한 문장 더.<br>“이렇게 된 데에는 이유가 있어. 너만 잘못한 게 아니야.”`
            ]
        }
    },
    pt: {
        title: "Ⅱ. 마음 PT 플랜",
        intro: `<h3>회원님 인바디 요약(마음 버전) — 코치 노트</h3>
                <p>회원님은 **버티는 근육(지속력)**이 이미 발달해 있어요.<br>
                에세이에서 이렇게 말했죠.<br>
                * “아침에 눈을 뜨면 가장 먼저 해야 할 일과 일정이 떠오르는 편”<br>
                * “해야 할 일은 많은데 구조나 우선순위가 없는 상태가 오면… 잡을 손잡이가 사라진 상태”<br>
                * “밤 늦게… 모두가 잠들어갈 즈음 겨우 숨을 쉰다”<br>
                * “정리한다는 행위는 ‘나는 다시 중심을 잡을 수 있어’라는 가느다란 확신”<br>
                * “마음은 NO인데 입은 YES”<br>
                * “감정을 억누르면 무력감과 냉소가 커진다”<br><br>
                즉, 회원님에게 필요한 PT는 **‘의지 강화’가 아니라 ‘정렬/복귀/경계/회복’**입니다.<br>
                근육을 더 키우기보다, **긴장을 풀고 자세를 잡는 운동**이 핵심이에요.</p>
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
                    <strong style="color: #ef4444;">⚠️ 안전 안내(짧게)</strong><br>
                    <span style="font-size: 0.9rem; color: #fca5a5;">이 계획은 치료가 아니라 훈련입니다.<br>
                    다만 **자해/자살 생각, 폭력·학대, 수면이 며칠 붕괴, 일상 기능 마비** 같은 신호가 있으면 훈련보다 **즉시 도움 요청(주변/전문기관)**이 우선입니다.</span>
                </div>`,
        routines: [
            {
                title: "1) 워밍업: 3분 정렬 루틴 (매일)",
                desc: "**목표:** “돌을 없애기”가 아니라, **돌을 안고도 중심이 서는 자세**를 먼저 잡습니다.<br>회원님은 에세이에서 “일정이 먼저 떠오른다”고 했어요. 이 말은 곧, **하루가 시작되자마자 중량을 얹고 출발한다**는 뜻입니다.<br>그래서 워밍업은 **각성 낮추기 → 중량 체크 → 오늘의 기준선 설정** 순서로 갑니다.",
                items: [
                    "<strong>(1) 호흡 30초: 몸의 각성 낮추기</strong><br>* **방법:** 숨을 “길게” 3번. 들숨보다 **날숨을 2배**로.<br>* **코치 멘트:** 회원님은 “호흡이 가벼워지는 순간들이 있었다”고 했죠.<br>  이건 의지가 약해서가 아니라 **긴장이 오래 누적된 몸**의 신호예요.<br>  워밍업은 마음이 아니라 **신경계부터** 푸는 겁니다.",
                    "<strong>(2) 중량 체크 60초: 오늘의 돌·강·표정 한 줄 기록</strong><br>* 종이에 딱 한 줄만 씁니다.<br>**돌(Load) / 강(Environment) / 표정(Gear)**<br>* 돌: “오늘 내 돌은 ___ 때문에 무겁다.”<br>* 강: “오늘 강의 유속은 ___(느림/보통/빠름)이다.”<br>* 표정: “내 표정 기어는 ___(담담/무표정/가라앉음/분노/웃음)이다.”<br><br>> 에세이 인용: “정리는 통제감 회복 행동… ‘나는 다시 중심을 잡을 수 있어’라는 확신.”<br>> 그래서 기록은 분석이 아니라 **중심 복귀 장치**예요.",
                    "<strong>(3) 오늘의 한 문장 60초: “오늘 나는 ___만 지키면 된다”</strong><br>회원님은 자꾸 “조금만 더 잘해보자”로 증량이 과해지는 패턴이 있었죠.<br>그래서 오늘의 한 문장은 **최소 기준(미니멈)**만 설정합니다.<br><br>예시(선택 1개)<br>* “오늘 나는 **우선순위 1개만** 지키면 된다.”<br>* “오늘 나는 **NO 대신 지연 문장 1번**만 지키면 된다.”<br>* “오늘 나는 **밤이 아니라 낮에 정리 3분**만 지키면 된다.”",
                    "<strong>(4) 첫 행동 30초: 물/창문/자리 정리</strong><br>* 물 한 컵 or 창문 열기 or 책상 1분 정리<br>* **코치 멘트:** 회원님은 “정리하기 시작한다”가 자동 반응이에요.<br>  그걸 탓하지 말고, **“첫 행동”으로 합법화**합니다.<br>  대신 밤에 몰아서 하지 않도록, 낮에 30초로 끊습니다."
                ]
            },
            {
                title: "2) 데일리 메인 세트: 10분 근력 루틴 (매일)",
                desc: "**목표:** 회원님 핵심 4근육을 매일 짧게 단련합니다.<br>* 컨트롤(다룰 수 있음 회복)<br>* 마찰 감소(보호층)<br>* 복귀(다시 한 칸)<br>* 경계 문장(관계에서 무너지지 않기)<br><br>> 에세이 인용: “돌의 무게가 늘어난 게 아니라, 잡을 손잡이가 사라진 상태.”<br>> 그래서 세트들은 전부 **손잡이(핸들)를 다시 만들어주는 운동**입니다.",
                items: [
                    `<strong>세트 A — 컨트롤: 감정이 올라올 때 “다룰 수 있음” 회복 (3분)</strong><br>
                    **상황:** 안개/바람처럼 불안이 오거나, 복잡함/혼란이 몰려올 때.<br>
                    > 에세이 인용: “안개/바람… 뚜렷하진 않지만 불안하고 흔들린다”<br><br>
                    **A-1. ‘이름 붙이기’ 30초**<br>
                    * “지금은 ___ 때문에 무겁다.”(한 단어)<br>
                      예: 기대, 무심함, 일정, 책임, 미래, 비교<br><br>
                    **A-2. ‘컨트롤 문장’ 60초**<br>
                    아래 중 1개를 소리 내서 읽습니다.<br>
                    * “지금 내 마음은 **모드**일 뿐, **정체성**이 아니다.”<br>
                    * “나는 감정을 없애는 게 아니라 **중심을 잡는 훈련**을 한다.”<br>
                    * “오늘은 해결이 아니라 **정렬**이 목표다.”<br><br>
                    **A-3. ‘한 칸 행동’ 90초**<br>
                    * “지금 당장 5분짜리 1개”를 정해 90초만 착수<br>
                      (완료가 아니라 **착수**가 목표)<br><br>
                    > 코치 포인트: 회원님은 “생각이 많아 정리가 안 된다”가 오면 소모가 커져요.<br>
                    > 그래서 컨트롤은 “생각 정리”가 아니라 **몸을 움직여 ‘착수’로 전환**하는 방식이 더 잘 먹힙니다.`,

                    `<strong>세트 B — 마찰 감소: 자극에 닳지 않게 보호층 만들기 (2분)</strong><br>
                    회원님은 자극 자체보다 “정리가 안 된 상태”에서 닳지만,<br>
                    트리거가 눌릴 때는 특히 강해요.<br>
                    > 에세이 인용: “중요한 사람에게서 ‘신경 쓰지 않는 것 같은’ 반응”이 흔들림<br><br>
                    **B-1. 10분 지연 룰 60초**<br>
                    * 메신저/대답/결정은 “즉시”가 아니라 **10분 후**<br>
                    * 그 10분 동안은 숨 3번 + 물 한 모금<br><br>
                    **B-2. 보호 문장 60초**<br>
                    * “나는 지금 즉답하면 **돌을 더 얹는다.**”<br>
                    * “지금은 **받아들이기**보다 **내 중심 먼저.**”<br><br>
                    > 코치 포인트: 이 세트는 성격 교정이 아니라 **마찰을 줄이는 장갑**이에요.<br>
                    > 회원님 표현대로 “무게보다 마찰이 문제”가 되는 날에 효과가 큽니다.`,

                    `<strong>세트 C — 복귀: 하루가 깨졌을 때 ‘다시 한 칸’ 규칙 (3분)</strong><br>
                    > 에세이 인용: “계획이 깨지고 다시 세우는 일이 반복… 필요한 건 완벽함보다 ‘다시 시작하는 방법’”<br><br>
                    **C-1. 리셋 문장 20초**<br>
                    * “오늘은 망했어” → “**다시 한 칸만 가자**”<br><br>
                    **C-2. 복귀 행동 80초**<br>
                    아래 중 하나만:<br>
                    * 세수하기 / 책상 1분 / 물 한 컵 / 체크리스트 1개 만들기<br><br>
                    **C-3. ‘내일 예약’ 80초**<br>
                    * 내일 아침 캘린더에 10분만 적습니다: “정렬 10분”<br>
                    * 코치 멘트: 밤에 몰아서 만회하지 않습니다.<br>
                      회원님은 “밤 늦게 숨 쉰다”고 했죠.<br>
                      밤을 ‘회복’으로 남겨두는 게 체질화의 핵심입니다.`,

                    `<strong>세트 D — 경계 문장: 관계에서 무너지지 않는 한 문장 (2분)</strong><br>
                    회원님 핵심 패턴이 이거였죠.<br>
                    > 에세이 인용: “마음은 NO인데 입은 YES… 좋은 사람이고 싶다 + 기회를 놓칠까 불안”<br>
                    그래서 경계는 거절이 아니라 **지연/조건/한계**로 갑니다.<br>
                    (회원님에게 가장 잘 맞는 방식)<br><br>
                    **D-1. 지연 문장(기본)**<br>
                    * “지금은 어려워, **내일 답할게**.”<br>
                    * “**생각해보고** 알려줄게.”<br><br>
                    **D-2. 종료 문장(강한 날)**<br>
                    * “오늘은 **여기까지** 할게.”<br>
                    * “내 컨디션이 안 좋아서 **지금은 못해**.”<br><br>
                    > 코치 포인트: “고마워 오늘은 내가 받는 날이네.”<br>
                    > 이 문장은 관계의 숨구멍입니다.<br>
                    > ‘교환’이 아니라 ‘순서’로 관계를 바꿉니다.`
                ]
            },
            {
                title: "3) 주간 프로그램: 7일 마이크로사이클 (매주 반복)",
                desc: "**목표:** 회원님에게 가장 위험한 건 “열심히 했다가 확 꺼지는 번아웃”이었죠.<br>그래서 주간은 근력(강도)만 올리지 않고, **가동성/회복을 정해진 비율로** 박아둡니다.<br><br>**주간 구조**<br>* **3일 강도(Load)**: 버티는 힘(지속) 훈련<br>* **2일 가동(Mobility)**: 마음의 유연성(전환) 훈련<br>* **2일 회복(Recovery)**: 정서적 회복력 회수<br>* **주간 점검 10분**: “무너진 원인 1개 + 복귀 1개”",
                items: [
                    `<strong>(A) 3일 강도(Load) — “지속” 훈련</strong><br>
                    **실행:** 데일리 메인 10분 + 추가 5분(총 15분)<br><br>
                    추가 5분은 딱 하나:<br>
                    * 우선순위 1개를 “끝내기”까지<br>
                    * 또는 ‘지연 문장’ 1번을 실제로 쓰기<br>
                    * 또는 낮에 “정리 3분”을 실행하기<br><br>
                    > 에세이 인용: “조금만 더 잘해보자 → 기준이 높아지고 여유가 줄어든다”<br>
                    > 강도일은 “더 많이”가 아니라 **정해진 15분만**입니다.<br>
                    > 회원님은 증량 재능이 과해서, *한도를 정하는 것*이 PT의 핵심이에요.`,

                    `<strong>(B) 2일 가동(Mobility) — “전환” 훈련</strong><br>
                    **목표:** 안개/혼란에서 빠져나오는 경로를 몸에 기억시키기<br>
                    **실행:** 10분 중 세트 A와 C 비중을 높임<br>
                    * 세트 A(컨트롤) 4분<br>
                    * 세트 C(복귀) 4분<br>
                    * 세트 B or D 2분<br><br>
                    추가로 1개:<br>
                    * 10분 산책(가능하면)<br><br>
                    > 에세이 인용: “조용히 혼자 걷거나 익숙한 길을 산책한다”<br>
                    > 이건 회원님에게 이미 검증된 **가동성 운동**입니다.<br>
                    > 근육이 뭉치면 폼이 무너지듯, 마음도 가동성이 있어야 컨트롤이 돌아와요.`,

                    `<strong>(C) 2일 회복(Recovery) — “회수” 훈련</strong><br>
                    **실행:** 10분을 6분으로 줄입니다.<br>
                    * 워밍업 3분은 유지<br>
                    * 메인 세트는 A(2분) + C(1분)만<br><br>
                    회복일에 해야 할 핵심은 1개예요.<br>
                    **“밤을 회복으로 남겨두기”**<br><br>
                    > 에세이 인용: “밤 늦게… 겨우 숨을 쉰다”<br>
                    > 밤이 숨구멍인 사람은, 그 숨구멍을 ‘만회’로 막으면 다음 주에 무너집니다.`,

                    `<strong>(D) 주간 점검 10분 (일요일 권장)</strong><br>
                    노트에 딱 두 줄:<br>
                    1. 이번 주에 **무너진 날의 원인 1개**<br>
                    * 예: 구조 없음 / 무심함 트리거 / YES 남발 / 밤 만회<br>
                    2. 그날 나를 살린 **복귀 1개**<br>
                    * 예: “다시 한 칸” / 물 한 컵 / 지연 문장 / 낮 3분 정리<br><br>
                    마지막으로 한 문장:<br>
                    * “다음 주엔 ___만 조심하자.”`
                ]
            },
            {
                title: "4) 한 달 프로그램: 4주 주기 설계 (월 단위)",
                desc: "**목표:** 회원님은 “이번만은 다를 거야”로 비슷한 패턴을 반복했죠.<br>월 단위는 마음의 근육을 키우는 게 아니라, **패턴을 설계로 이기는 구조**입니다.",
                items: [
                    `<strong>1주 적응: 루틴을 ‘가능한 크기’로 줄이기</strong><br>
                    * 데일리 메인 10분을 8분으로<br>
                    * 경계 문장(D)은 “지연 문장”만 연습(강한 거절 금지)<br>
                    * 기록(중량 체크)만은 매일 유지<br>
                    **성공 기준:** “완벽히”가 아니라 “끊기지 않음”`,

                    `<strong>2주 증량: 세트 수/빈도 소폭 증가</strong><br>
                    * 10분 유지<br>
                    * 강도일 3일 중 1일만 “추가 5분”<br>
                    * 회복일은 반드시 지킨다(여기서 무너지면 의미 없음)<br><br>
                    > 에세이 인용: “기준이 점점 높아지며 여유가 줄어든다”<br>
                    > 증량은 회원님이 제일 잘하지만, **회복을 같이 올리는 증량**만 허용합니다.`,

                    `<strong>3주 유지: 흔들려도 끊기지 않게 고정</strong><br>
                    * 가장 바쁜 주라고 가정하고 설계합니다.<br>
                    * 데일리 10분을 “6분 대체 루틴”으로 바꿔도 OK<br>
                      (= 끊김 방지)<br><br>
                    **유지 주의 핵심 문장**<br>
                    * “오늘은 다 못해도 돼. **하나만 해도 충분해**.”<br>
                      (에세이의 톤을 그대로 가져옵니다)`,

                    `<strong>4주 덜어내기(Deload): 회복 주간으로 신뢰 회복</strong><br>
                    * 강도일을 1일로 줄이고<br>
                    * 회복일을 3일로 늘립니다.<br>
                    * 대신 “관계 경계(D)”는 유지합니다.<br><br>
                    **델로드의 목적:** 성과가 아니라 **자기 신뢰 회복**<br>
                    > 에세이 인용: “내일도 어떻게든 살아보자”<br>
                    > 이 말이 ‘버티기’가 아니라 ‘회복’에서 나오도록 만드는 주간입니다.`
                ]
            },
            {
                title: "5) 90일 로드맵: 체질화(習慣化) 단계 (분기)",
                desc: "회원님이 원하는 건 결국 이거였죠.<br>“지친 몸과 여전히 살아 있는 마음이 서로 타협점을 찾는 과정.”<br>90일은 그 타협점을 **고정 루트**로 만드는 기간입니다.",
                items: [
                    `<strong>0–30일: “기록–복귀–경계” 세 가지 뼈대 세우기</strong><br>
                    * 기록(3분) 매일<br>
                    * 복귀(C) 규칙 1개 몸에 박기<br>
                    * 경계(D) 지연 문장 자동화<br><br>
                    **성공 지표(체감형)**<br>
                    * “무너졌을 때 예전보다 빨리 돌아온다”<br>
                    * “YES를 말하기 전에 10분이 생긴다”`,

                    `<strong>31–60일: 내 트리거 지도 만들기(반응 패턴 안정화)</strong><br>
                    회원님 트리거는 이미 일부 드러났어요.<br>
                    * “무심함”<br>
                    * “구조 없음”<br>
                    * “좋은 사람이어야 한다”<br>
                    * “밤 만회”<br><br>
                    여기서 하는 훈련:<br>
                    * 트리거가 오면 “이름 붙이기(A-1)”를 자동 실행<br>
                    * 트리거별 대체 동작 1개씩 지정<br><br>
                    예)<br>
                    * 무심함 트리거 → “지연 문장 + 물 한 컵”<br>
                    * 구조 없음 → “우선순위 1개만 적기”<br>
                    * YES 충동 → “생각해보고 알려줄게”<br>
                    * 밤 만회 → “내일 10분 예약”`,

                    `<strong>61–90일: 나만의 강을 건너는 ‘고정 루트’ 만들기</strong><br>
                    이 단계의 목표는 “기분이 좋아졌다”가 아니라,<br>
                    **강의 유속이 빨라도 건널 수 있는 루트 확보**입니다.<br><br>
                    * 루트는 3개면 충분합니다.<br>
                    1. 평시 루트(10분)<br>
                    2. 바쁜 날 루트(6분)<br>
                    3. 무너진 날 루트(5분 응급)<br><br>
                    > 에세이 인용: “필요한 건 완벽함보다 다시 시작하는 방법”<br>
                    > 고정 루트가 생기면, 흔들림은 더 이상 실패가 아니라 **절차**가 됩니다.`,

                    `<strong>리셋 규칙: 끊겨도 실패가 아닌 “재시작 프로토콜”</strong><br>
                    끊긴 다음날, 두 가지만 하면 복귀 성공입니다.<br>
                    1. 워밍업 3분(호흡+중량체크)<br>
                    2. 세트 C(복귀)만 실행<br><br>
                    그리고 스스로에게 딱 한 문장:<br>
                    * “그때 포기하지 않고, 천천히라도 계속해줘서 고마워.”<br>
                      (회원님이 미래의 나에게 남기고 싶던 문장을 **현재로 당겨옵니다**)`
                ]
            },
            {
                title: "6) 응급 루틴: 무너짐 대비 5분 프로토콜 (필요할 때)",
                desc: "회원님은 감정을 억누르면 “무력감과 냉소”가 커진다고 했죠.<br>응급 루틴은 그 경고등이 켜졌을 때 실행합니다.<br>핵심은 **짧고, 즉각적이고, 몸을 움직이는 것**입니다.",
                items: [
                    `<strong>1분: 숨 길게 3번 + 어깨 내리기</strong><br>* “몸이 먼저 보내준 신호”를 인정하는 단계`,
                    `<strong>1분: 화면 내려놓기 + 자리 이동(환경 전환)</strong><br>* 강의 유속이 빨라졌을 때는, 발 디딜 곳을 바꾸는 게 먼저입니다.`,
                    `<strong>1분: “지금은 ___ 때문에 무겁다” 이름 붙이기</strong><br>* 안개가 뚜렷해지는 순간, 흔들림이 줄어요.`,
                    `<strong>1분: ‘가장 작은 행동 1개’만 실행</strong><br>* 물 한 컵 / 세수 / 체크리스트 1줄 / 창문 열기`,
                    `<strong>1분: 연결 한 줄 또는 종료 문장</strong><br>* 연결: “오늘 좀 지쳐”<br>* 종료: “오늘은 여기까지”<br>> 에세이 인용: “도움을 요청하는 타이밍이 늦어져 고립감이 커질 수 있다”<br>> 한 줄은 관계를 해결하지 않지만, **고립을 끊습니다.**`
                ]
            }
        ],
        coachSummary: {
            title: "코치의 마지막 정리: 회원님에게 맞는 ‘증량 원칙’ 3가지",
            items: [
                `<b>1. 증량은 ‘시간’이 아니라 ‘복귀 속도’로 측정</b><br>* 더 오래 하기보다, 더 빨리 돌아오기`,
                `<b>2. 강도 올리면 회복도 같이 올리기</b><br>* 회원님은 강도만 올리는 재능이 너무 좋습니다(그래서 번아웃이 왔어요)`,
                `<b>3. 경계는 거절이 아니라 ‘지연’부터</b><br>* “생각해보고 알려줄게”는 회원님에게 가장 현실적인 바벨입니다.`
            ]
        }
    }
};

function showEssayResult() {
    // Force container to be wide enough for text but centered
    dom.container.style.maxWidth = "800px";

    let html = `
        <div class="fullscreen-result" style="padding-bottom: 6rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <span style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; margin-bottom: 1rem; display: inline-block;">AI Mind Analysis</span>
                <h2 style="color: #fff; font-size: 1.8rem; margin-bottom: 0.5rem; font-family: 'Noto Serif KR', serif;">${MOCK_RESULT.essay.title}</h2>
            </div>
            
            <hr style="border-color: rgba(255,255,255,0.1); margin: 2rem 0;">

            <div class="essay-content" style="line-height: 1.9; color: #e2e8f0; font-size: 1.05rem;">
                <p style="margin-bottom: 2rem; color: #cbd5e1;">${MOCK_RESULT.essay.intro}</p>

                <div style="margin-top: 3rem;">
                    ${MOCK_RESULT.essay.sections.map(sec => `
                        <div style="margin-bottom: 2.5rem;">
                            <h4 style="font-size: 1.2rem; color: var(--accent-color); margin-bottom: 0.8rem; font-weight: 700;">${sec.title}</h4>
                            <p style="color: #cbd5e1;">${sec.content}</p>
                        </div>
                    `).join('')}
                </div>

                ${renderEssaySection(MOCK_RESULT.essay.part2)}
                ${renderEssaySection(MOCK_RESULT.essay.part3)}
                ${renderEssaySection(MOCK_RESULT.essay.part4)}
                ${renderEssaySection(MOCK_RESULT.essay.part5)}
                
                <div style="margin-top: 4rem;">
                    <h3 style="font-size: 1.6rem; color: #fff; margin-bottom: 1.5rem; font-family: 'Noto Serif KR', serif;">${MOCK_RESULT.essay.part6.title}</h3>
                    <p style="margin-bottom: 2rem;">${MOCK_RESULT.essay.part6.intro}</p>
                </div>

                 <div style="margin-top: 4rem; background: rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 12px; border: 1px solid var(--accent-color);">
                    <h3 style="font-size: 1.4rem; color: var(--accent-color); margin-bottom: 1.5rem;">${MOCK_RESULT.essay.conclusion.title}</h3>
                    <p style="margin-bottom: 2rem; color: #cbd5e1;">${MOCK_RESULT.essay.conclusion.intro}</p>
                    <ul style="list-style: none; padding: 0;">
                        ${MOCK_RESULT.essay.conclusion.items.map(item => `<li style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px dashed rgba(255,255,255,0.1);">${item}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div style="margin-top: 5rem; text-align: center;">
                <p style="margin-bottom: 1rem; color: #94a3b8;">분석이 마음에 드셨나요?</p>
                <button class="cta-btn" onclick="showPTResult()">
                    내 맞춤 훈련(PT) 계획 보기 →
                </button>
            </div>
        </div>
    `;
    dom.container.innerHTML = html;
    window.scrollTo(0, 0);
}

function renderEssaySection(part) {
    if (!part) return '';
    return `
        <div style="margin-top: 4rem;">
            <h3 style="font-size: 1.6rem; color: #fff; margin-bottom: 1.5rem; font-family: 'Noto Serif KR', serif;">${part.title}</h3>
            ${part.intro ? `<p style="margin-bottom: 2rem; color: #cbd5e1;">${part.intro}</p>` : ''}
            
            <div style="display: grid; gap: 2rem;">
                ${part.sections.map(sec => `
                    <div>
                        <h4 style="font-size: 1.2rem; color: var(--accent-color); margin-bottom: 0.8rem; font-weight: 700;">${sec.title}</h4>
                        <p style="color: #cbd5e1;">${sec.content}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function showPTResult() {
    let html = `
        <div class="fullscreen-result" style="padding-bottom: 6rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <span style="background: var(--accent-color); color: #0f172a; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 1rem; display: inline-block;">ACTION PLAN</span>
                <h2 style="color: #fff; font-size: 2rem; margin-bottom: 0.5rem;">${MOCK_RESULT.pt.title}</h2>
            </div>
            
            <hr style="border-color: rgba(255,255,255,0.1); margin: 2rem 0;">

            <div class="pt-content">
                <div style="margin-bottom: 3rem; line-height: 1.7;">
                    ${MOCK_RESULT.pt.intro}
                </div>

                <div class="pt-list" style="display: flex; flex-direction: column; gap: 3rem;">
                    ${MOCK_RESULT.pt.routines.map(routine => `
                        <div style="background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%); padding: 2rem; border-radius: 12px; border-left: 4px solid var(--accent-color);">
                            <h4 style="font-size: 1.4rem; margin-bottom: 1rem; color: #fff;">${routine.title}</h4>
                            <p style="font-size: 1rem; color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.6;">${routine.desc}</p>
                            <ul style="list-style: none; padding: 0;">
                                ${routine.items.map(item => `
                                    <li style="padding: 1rem 0; border-top: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; font-size: 1.05rem; display: flex; align-items: flex-start; line-height: 1.7;">
                                        <span style="color: var(--accent-color); margin-right: 0.8rem; margin-top: 0.3rem;">✓</span> 
                                        <span>${item}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>

                <div style="margin-top: 4rem; background: rgba(59, 130, 246, 0.1); padding: 2.5rem; border-radius: 12px; border: 1px solid #3b82f6;">
                    <h3 style="font-size: 1.3rem; color: #60a5fa; margin-bottom: 1.5rem;">${MOCK_RESULT.pt.coachSummary.title}</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${MOCK_RESULT.pt.coachSummary.items.map(item => `<li style="margin-bottom: 1rem; color: #bfdbfe; font-size: 1.1rem;">${item}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <div style="margin-top: 5rem; text-align: center;">
                 <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="showEssayResult()" style="background: rgba(255,255,255,0.1); border:none; color: white; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">← 에세이 다시 보기</button>
                    <button onclick="location.reload()" style="background: none; border: 1px solid rgba(255,255,255,0.3); color: #94a3b8; padding: 1rem 2rem; border-radius: 8px; cursor: pointer;">처음으로</button>
                </div>
                <p style="margin-top: 2rem; color: #64748b; font-size: 0.9rem;">전체 서비스 오픈 시 PDF 저장 기능을 제공합니다.</p>
            </div>
        </div>
    `;
    dom.container.innerHTML = html;
    window.scrollTo(0, 0);
}

init();

/**
 * 104 Job Compare - Main Application Logic
 *
 * Since 104's API requires a Referer header (blocked by CORS in browsers),
 * we use multiple CORS proxy services as fallback, and provide manual input
 * as a last resort.
 */

// ─── Skill Keyword Dictionary ─────────────────────────────────────
const SKILL_KEYWORDS = [
    // === Engineering / Programming ===
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C#', 'C\\+\\+', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
    'React', 'Vue', 'Angular', 'Next\\.js', 'Node\\.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Laravel',
    'HTML', 'CSS', 'SASS', 'Tailwind',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
    'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible', 'Jenkins', 'GitLab CI', 'GitHub Actions',
    'AWS', 'GCP', 'Azure', 'Heroku', 'Vercel',
    'Linux', 'Nginx', 'Apache',
    'Git', 'REST', 'RESTful', 'GraphQL', 'gRPC', 'WebSocket', 'API',
    'CI/CD', 'DevOps', 'Microservices', 'Serverless',
    'Unit Test', 'TDD', 'BDD', 'Jest', 'Mocha', 'Pytest',
    // === AI / Data / ML ===
    'AI', 'Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'GPT', 'BERT', 'Transformer',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
    'Data Pipeline', 'ETL', 'Data Warehouse', 'BigQuery', 'Snowflake', 'Spark', 'Hadoop', 'Airflow',
    'Tableau', 'Power BI', 'Looker', 'Data Studio',
    'Computer Vision', 'RAG', 'Prompt Engineering', 'Fine-tuning',
    // === PM / Management ===
    'Agile', 'Scrum', 'Kanban', 'Waterfall', 'PRINCE2',
    'Jira', 'Confluence', 'Trello', 'Asana', 'Monday', 'Notion',
    'PRD', 'MRD', 'BRD', 'User Story', 'Roadmap',
    'OKR', 'KPI', 'ROI', 'A/B Test', 'AB Testing',
    'Stakeholder', 'Sprint', 'Backlog', 'MVP',
    'PMP', 'PMI', 'Six Sigma', 'Lean',
    // === Design / UX ===
    'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin',
    'UI/UX', 'UX', 'UI', 'Wireframe', 'Prototype', 'Design Thinking', 'User Research',
    'Photoshop', 'Illustrator', 'After Effects', 'Premiere',
    // === Marketing / Growth ===
    'SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'GA4', 'Google Analytics', 'GTM',
    'CRM', 'HubSpot', 'Salesforce', 'Mailchimp',
    'MarTech', 'Growth Hacking', 'Content Marketing', 'Social Media',
    // === Business / ERP ===
    'SAP', 'Oracle', 'ERP', 'CRM', 'BI',
    'Excel', 'VBA', 'Power Automate', 'RPA',
    'Blockchain', 'FinTech', 'IoT', 'SaaS', 'PaaS',
];

// ─── Field Definitions ────────────────────────────────────────────
const FIELD_DEFS = [
    { key: 'salary', icon: '💰', label: '薪資待遇', type: 'info', cssClass: 'salary' },
    { key: 'location', icon: '📍', label: '工作地點', type: 'info', cssClass: 'location' },
    { key: 'experience', icon: '💼', label: '經歷要求', type: 'info', cssClass: 'experience' },
    { key: 'education', icon: '🎓', label: '學歷要求', type: 'info', cssClass: 'education' },
    { key: 'skills', icon: '🏷️', label: '技能要求', type: 'tags' },
    { key: 'tools', icon: '🔧', label: '工具', type: 'tags' },
    { key: 'detectedSkills', icon: '📎', label: '偵測技能', type: 'tags' },
    { key: 'languages', icon: '🌐', label: '語言能力', type: 'tags' },
    { key: 'jobDescription', icon: '📝', label: '工作內容', type: 'text' },
    { key: 'welfare', icon: '🎁', label: '福利', type: 'text' },
    { key: 'others', icon: '📌', label: '其他條件', type: 'info' },
];

// Default visible fields
const DEFAULT_VISIBLE = ['salary', 'location', 'experience', 'education', 'skills', 'tools', 'detectedSkills'];

// ─── State ────────────────────────────────────────────────────────
const state = {
    jobs: [],           // all collected jobs
    selected: new Set(), // jobIds that are selected for comparison
    visibleFields: new Set(DEFAULT_VISIBLE), // which fields to show
    customKeywords: [],  // user-defined keywords
};

const STORAGE_KEY = 'anti104_jobs';
const STORAGE_SELECTED_KEY = 'anti104_selected';
const STORAGE_KEYWORDS_KEY = 'anti104_keywords';
const STORAGE_FIELDS_KEY = 'anti104_fields';
const CARD_COLORS = [
    'card-color-0', 'card-color-1', 'card-color-2',
    'card-color-3', 'card-color-4', 'card-color-5',
];

// ─── CORS Proxies ─────────────────────────────────────────────────
const CORS_PROXIES = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

// ─── DOM References ───────────────────────────────────────────────
const dom = {
    input: document.getElementById('job-url-input'),
    addBtn: document.getElementById('add-job-btn'),
    btnText: document.querySelector('.btn-text'),
    btnLoading: document.querySelector('.btn-loading'),
    inputError: document.getElementById('input-error'),
    jobsGrid: document.getElementById('jobs-grid'),
    emptyState: document.getElementById('empty-state'),
    statsBar: document.getElementById('stats-bar'),
    statCount: document.getElementById('stat-count'),
    statMaxSalary: document.getElementById('stat-max-salary'),
    statCommonSkills: document.getElementById('stat-common-skills'),
    statLocations: document.getElementById('stat-locations'),
    skillSummary: document.getElementById('skill-summary'),
    skillMatrix: document.getElementById('skill-matrix'),
    jobCountTag: document.getElementById('job-count-tag'),
    jobPool: document.getElementById('job-pool'),
    jobPoolList: document.getElementById('job-pool-list'),
    selectAllBtn: document.getElementById('select-all-btn'),
    deselectAllBtn: document.getElementById('deselect-all-btn'),
    poolSelectedCount: document.getElementById('pool-selected-count'),
    fieldFilter: document.getElementById('field-filter'),
    fieldChips: document.getElementById('field-chips'),
    keywordInput: document.getElementById('keyword-input'),
    addKeywordBtn: document.getElementById('add-keyword-btn'),
    customKeywords: document.getElementById('custom-keywords'),
    batchProgress: document.getElementById('batch-progress'),
    batchStatus: document.getElementById('batch-status'),
    batchCount: document.getElementById('batch-count'),
    batchBarFill: document.getElementById('batch-bar-fill'),
};

// ─── URL Parsing ──────────────────────────────────────────────────
function parseJobId(url) {
    const trimmed = url.trim();

    // Match patterns:
    // https://www.104.com.tw/job/8t66t
    // https://www.104.com.tw/job/8t66t?...
    // www.104.com.tw/job/8t66t
    // 104.com.tw/job/8t66t
    const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?104\.com\.tw\/job\/([a-zA-Z0-9]+)/);
    if (match) return match[1];

    // If someone just pastes the job ID directly
    if (/^[a-zA-Z0-9]{4,10}$/.test(trimmed)) return trimmed;

    return null;
}

// ─── Fetch Job Data ───────────────────────────────────────────────
async function fetchViaProxy(jobId) {
    const apiUrl = `https://www.104.com.tw/job/ajax/content/${jobId}`;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxyUrl = CORS_PROXIES[i](apiUrl);
            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000),
            });

            if (!response.ok) continue;

            const text = await response.text();
            const data = JSON.parse(text);
            if (data && data.data) return data;
        } catch (e) {
            console.warn(`Proxy ${i} failed:`, e.message);
        }
    }

    return null;
}

function extractJobData(raw, jobId) {
    const d = raw.data || raw;
    const header = d.header || {};
    const condition = d.condition || {};
    const jobDetail = d.jobDetail || {};
    const welfare = d.welfare || {};

    // Parse salary numbers from salaryDesc
    let salaryText = header.salaryDesc || condition.salary || '';

    // Extract location
    let location = '';
    if (jobDetail.addressRegion) location = jobDetail.addressRegion;
    else if (condition.addressRegion) location = condition.addressRegion;
    else if (header.jobAddrNo498) location = header.jobAddrNo498;

    let locationDetail = jobDetail.addressDetail || condition.addressDetail || '';

    // Combine area info
    const areaArr = d.jobDetail?.area || [];
    if (!location && areaArr.length > 0) {
        location = areaArr.map(a => a.des || a.description || '').join('、');
    }

    return {
        jobId,
        url: `https://www.104.com.tw/job/${jobId}`,
        title: header.jobName || '',
        company: header.custName || '',
        companyUrl: header.custUrl
            ? 'https://' + header.custUrl.replace(/^https?:?\/\//, '')
            : '',
        location: location || '未提供',
        locationDetail,
        salary: salaryText || '面議',
        experience: condition.workExp || header.workExp || '',
        education: Array.isArray(condition.edu)
            ? condition.edu.map(e => typeof e === 'string' ? e : (e.name || e.desc || '')).join('、')
            : (condition.edu || ''),
        major: Array.isArray(condition.major)
            ? condition.major.map(m => typeof m === 'string' ? m : (m.name || '')).join('、')
            : '',
        skills: Array.isArray(condition.skill)
            ? condition.skill.map(s => typeof s === 'string' ? s : (s.description || s.name || ''))
            : [],
        tools: Array.isArray(condition.specialty)
            ? condition.specialty.map(t => typeof t === 'string' ? t : (t.description || t.name || ''))
            : [],
        languages: Array.isArray(condition.language)
            ? condition.language.map(l => {
                const name = typeof l.language === 'object' ? (l.language.desc || l.language.name || '') : (l.language || l.name || '');
                const level = typeof l.ability === 'object' ? (l.ability.desc || l.ability.name || '') : (l.ability || '');
                const lvl2 = typeof l.level === 'object' ? (l.level.desc || l.level.name || '') : (l.level || '');
                const finalLevel = level || lvl2;
                return finalLevel ? `${name} (${finalLevel})` : name;
            })
            : [],
        jobDescription: jobDetail.jobDescription || '',
        jobCategory: Array.isArray(header.jobCategoryList)
            ? header.jobCategoryList.map(c => c.description || c.name || '')
            : [],
        managementResp: condition.managementResp || '',
        businessTrip: condition.businessTrip || '',
        workPeriod: condition.workPeriod || '',
        vacationPolicy: condition.vacationPolicy || '',
        welfareText: welfare.welfare || '',
        updateDate: header.appearDate || '',
        others: condition.other || '',
    };
}

// ─── Manual Input Fallback ────────────────────────────────────────
function showManualInputModal(jobId) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
      <div class="modal-content">
        <h3 class="modal-title">📝 手動輸入職缺資料</h3>
        <p class="modal-desc">
          無法自動擷取職缺 <strong>${jobId}</strong> 的資料（可能因 API 限制）。<br>
          請開啟 <a href="https://www.104.com.tw/job/${jobId}" target="_blank" style="color: var(--accent-3);">職缺頁面</a>，手動填入以下資訊：
        </p>
        <div class="form-group">
          <label class="form-label">職缺名稱 *</label>
          <input class="form-input" id="manual-title" placeholder="例如：前端工程師">
        </div>
        <div class="form-group">
          <label class="form-label">公司名稱</label>
          <input class="form-input" id="manual-company" placeholder="例如：XX科技股份有限公司">
        </div>
        <div class="form-group">
          <label class="form-label">工作地點</label>
          <input class="form-input" id="manual-location" placeholder="例如：台北市信義區">
        </div>
        <div class="form-group">
          <label class="form-label">薪資</label>
          <input class="form-input" id="manual-salary" placeholder="例如：月薪 50,000~70,000元">
        </div>
        <div class="form-group">
          <label class="form-label">經歷要求</label>
          <input class="form-input" id="manual-experience" placeholder="例如：3年以上">
        </div>
        <div class="form-group">
          <label class="form-label">學歷要求</label>
          <input class="form-input" id="manual-education" placeholder="例如：大學">
        </div>
        <div class="form-group">
          <label class="form-label">技能要求（用逗號分隔）</label>
          <input class="form-input" id="manual-skills" placeholder="例如：React, Node.js, TypeScript">
        </div>
        <div class="form-group">
          <label class="form-label">工作內容</label>
          <textarea class="form-textarea" id="manual-desc" rows="3" placeholder="簡述工作內容..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" id="manual-cancel">取消</button>
          <button class="btn-primary" id="manual-submit">加入比較</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        overlay.querySelector('#manual-cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });

        overlay.querySelector('#manual-submit').addEventListener('click', () => {
            const title = document.getElementById('manual-title').value.trim();
            if (!title) {
                document.getElementById('manual-title').style.borderColor = 'var(--accent-danger)';
                return;
            }

            const skills = document.getElementById('manual-skills').value
                .split(/[,，、]/)
                .map(s => s.trim())
                .filter(Boolean);

            const job = {
                jobId,
                url: `https://www.104.com.tw/job/${jobId}`,
                title,
                company: document.getElementById('manual-company').value.trim(),
                companyUrl: '',
                location: document.getElementById('manual-location').value.trim() || '未提供',
                locationDetail: '',
                salary: document.getElementById('manual-salary').value.trim() || '面議',
                experience: document.getElementById('manual-experience').value.trim(),
                education: document.getElementById('manual-education').value.trim(),
                major: '',
                skills,
                tools: [],
                languages: [],
                jobDescription: document.getElementById('manual-desc').value.trim(),
                jobCategory: [],
                managementResp: '',
                businessTrip: '',
                workPeriod: '',
                vacationPolicy: '',
                welfareText: '',
                updateDate: '',
                others: '',
            };

            overlay.remove();
            resolve(job);
        });
    });
}

// ─── Skill Detection ───────────────────────────────────────────
function detectSkillsFromDescription(job) {
    const text = [job.jobDescription || '', job.others || ''].join(' ');
    if (!text.trim()) return [];

    // Combine built-in + custom keywords
    const allKeywords = [...SKILL_KEYWORDS, ...state.customKeywords];

    // Build set of already-listed official skills (lowercase) to avoid duplicates
    const officialSkills = new Set([
        ...job.skills, ...job.tools
    ].map(s => s.toLowerCase()));

    const detected = new Set();
    allKeywords.forEach(kw => {
        // Use word boundary matching (case-insensitive)
        try {
            const regex = new RegExp(`(?:^|[\\s,;/、，。()【】\\[\\]{}])${kw}(?:$|[\\s,;/、，。()【】\\[\\]{}])`, 'i');
            if (regex.test(text) && !officialSkills.has(kw.toLowerCase().replace(/\\\\/g, ''))) {
                // Use the original keyword casing for display
                detected.add(kw.replace(/\\\\/g, ''));
            }
        } catch (e) {
            // regex-safe: skip invalid patterns
        }
    });

    return [...detected];
}

// ─── Custom Keywords ──────────────────────────────────────────
function addCustomKeyword(kw) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (state.customKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
        showToast('ℹ️ 這個關鍵字已存在');
        return;
    }
    state.customKeywords.push(trimmed);
    saveToStorage();
    render();
    showToast(`✅ 已新增關鍵字「${trimmed}」`);
}

function removeCustomKeyword(kw) {
    state.customKeywords = state.customKeywords.filter(k => k !== kw);
    saveToStorage();
    render();
}

function renderCustomKeywords() {
    dom.customKeywords.innerHTML = '';
    state.customKeywords.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = 'custom-keyword-tag';
        tag.innerHTML = `${escapeHtml(kw)} <span class="remove-kw" title="移除">✕</span>`;
        tag.querySelector('.remove-kw').addEventListener('click', () => removeCustomKeyword(kw));
        dom.customKeywords.appendChild(tag);
    });
}

// ─── Selection Logic ──────────────────────────────────────────────
function toggleSelection(jobId) {
    if (state.selected.has(jobId)) {
        state.selected.delete(jobId);
    } else {
        state.selected.add(jobId);
    }
    saveToStorage();
    render();
}

function selectAll() {
    state.jobs.forEach(j => state.selected.add(j.jobId));
    saveToStorage();
    render();
}

function deselectAll() {
    state.selected.clear();
    saveToStorage();
    render();
}

function getSelectedJobs() {
    return state.jobs.filter(j => state.selected.has(j.jobId));
}

// ─── Add Job Flow ─────────────────────────────────────────────────
function parseMultipleUrls(text) {
    // Split by newlines, commas, spaces, then extract job IDs
    const parts = text.split(/[\n\r,\s]+/).filter(Boolean);
    const results = [];
    const seen = new Set();

    parts.forEach(part => {
        const jobId = parseJobId(part);
        if (jobId && !seen.has(jobId)) {
            seen.add(jobId);
            results.push({ jobId, original: part });
        }
    });

    return results;
}

async function addSingleJob(jobId) {
    // Check duplicates
    if (state.jobs.some(j => j.jobId === jobId)) {
        return { status: 'skip', msg: '已存在' };
    }

    try {
        const raw = await fetchViaProxy(jobId);
        if (!raw) {
            return { status: 'fail', msg: '無法擷取' };
        }
        const jobData = extractJobData(raw, jobId);
        state.jobs.push(jobData);
        state.selected.add(jobId);
        saveToStorage();
        render();
        return { status: 'ok', title: jobData.title };
    } catch (err) {
        console.error('Error adding job:', err);
        return { status: 'fail', msg: err.message };
    }
}

function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateBatchProgress(current, total, statusText) {
    dom.batchProgress.classList.remove('hidden');
    dom.batchStatus.textContent = statusText;
    dom.batchCount.textContent = `${current} / ${total}`;
    dom.batchBarFill.style.width = `${(current / total) * 100}%`;
}

async function addJobsBatch(text) {
    const urls = parseMultipleUrls(text);

    if (urls.length === 0) {
        showError('請貼上有效的 104 職缺網址（例如 https://www.104.com.tw/job/8t66t）');
        return;
    }

    // For single URL, use the original addJob (supports manual fallback)
    if (urls.length === 1) {
        addJob(urls[0].original);
        return;
    }

    // Filter out already existing jobs
    const existingIds = new Set(state.jobs.map(j => j.jobId));
    const newUrls = urls.filter(u => !existingIds.has(u.jobId));
    const skipped = urls.length - newUrls.length;

    if (newUrls.length === 0) {
        showToast(`ℹ️ 這 ${urls.length} 個職缺都已在清單中`);
        dom.input.value = '';
        return;
    }

    hideError();
    setLoading(true);
    dom.input.value = '';

    let succeeded = 0;
    let failed = 0;

    updateBatchProgress(0, newUrls.length, `準備擷取 ${newUrls.length} 個職缺...`);

    for (let i = 0; i < newUrls.length; i++) {
        const { jobId } = newUrls[i];
        updateBatchProgress(i, newUrls.length, `⏳ 正在擷取 (${i + 1}/${newUrls.length}): ${jobId}`);

        const result = await addSingleJob(jobId);
        if (result.status === 'ok') {
            succeeded++;
            showToast(`✅ (${i + 1}/${newUrls.length}) 已加入「${result.title}」`);
        } else if (result.status === 'fail') {
            failed++;
            showToast(`⚠️ (${i + 1}/${newUrls.length}) ${jobId} ${result.msg}`);
        } else {
            // skip
            showToast(`⏭️ (${i + 1}/${newUrls.length}) ${jobId} 已存在，跳過`);
        }

        updateBatchProgress(i + 1, newUrls.length,
            i < newUrls.length - 1 ? `⏸️ 等待中… 避免被 104 擋 (${i + 2}/${newUrls.length} 即將開始)` : '✅ 全部完成！');

        // Random delay between 3-6 seconds (except after the last one)
        if (i < newUrls.length - 1) {
            await randomDelay(3000, 6000);
        }
    }

    setLoading(false);

    // Summary toast (show for 5 seconds)
    let summary = `🎉 批次完成！成功 ${succeeded} 個`;
    if (failed > 0) summary += `，失敗 ${failed} 個`;
    if (skipped > 0) summary += `，跳過 ${skipped} 個 (已存在)`;
    showToast(summary, 5000);

    // Hide progress bar after 5 seconds
    setTimeout(() => {
        dom.batchProgress.classList.add('hidden');
    }, 5000);
}

async function addJob(url) {
    const jobId = parseJobId(url);
    if (!jobId) {
        showError('請輸入有效的 104 職缺網址（例如 https://www.104.com.tw/job/8t66t）');
        return;
    }

    // Check duplicates
    if (state.jobs.some(j => j.jobId === jobId)) {
        showError('這個職缺已經加入清單了！');
        return;
    }

    setLoading(true);
    hideError();

    try {
        const raw = await fetchViaProxy(jobId);

        let jobData;
        if (raw) {
            jobData = extractJobData(raw, jobId);
        } else {
            setLoading(false);
            jobData = await showManualInputModal(jobId);
            if (!jobData) return; // cancelled
        }

        state.jobs.push(jobData);
        state.selected.add(jobId); // auto-select new jobs
        saveToStorage();
        render();
        showToast(`✅ 已加入「${jobData.title}」`);
        dom.input.value = '';
    } catch (err) {
        console.error('Error adding job:', err);
        showError('取得職缺資料時發生錯誤，請重試');
    } finally {
        setLoading(false);
    }
}

function removeJob(jobId) {
    state.jobs = state.jobs.filter(j => j.jobId !== jobId);
    state.selected.delete(jobId);
    saveToStorage();
    render();
    showToast('🗑️ 已移除職缺');
}

// ─── Rendering ────────────────────────────────────────────────────
function render() {
    renderPool();
    renderFieldFilter();
    renderCustomKeywords();
    renderCards();
    renderStats();
    renderComparisonMatrix();
    updateCountTag();
}

function renderPool() {
    const pool = dom.jobPoolList;

    if (state.jobs.length === 0) {
        dom.jobPool.classList.add('hidden');
        return;
    }

    dom.jobPool.classList.remove('hidden');
    pool.innerHTML = '';

    state.jobs.forEach((job, index) => {
        const colorClass = CARD_COLORS[index % CARD_COLORS.length];
        const isSelected = state.selected.has(job.jobId);

        const item = document.createElement('div');
        item.className = `pool-item${isSelected ? ' selected' : ''}`;
        item.innerHTML = `
      <label class="pool-checkbox">
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-job-id="${job.jobId}" />
        <span class="checkmark"></span>
      </label>
      <div class="pool-item-color ${colorClass}"></div>
      <div class="pool-item-info">
        <span class="pool-item-title">${escapeHtml(job.title)}</span>
        <span class="pool-item-company">${escapeHtml(job.company)}</span>
      </div>
      <span class="pool-item-salary">${escapeHtml(job.salary)}</span>
      <button class="pool-item-delete" data-delete-id="${job.jobId}" title="刪除">✕</button>
    `;

        // Checkbox change
        item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            toggleSelection(e.target.dataset.jobId);
        });

        // Delete button
        item.querySelector('.pool-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            removeJob(e.currentTarget.dataset.deleteId);
        });

        pool.appendChild(item);
    });

    // Update pool count
    dom.poolSelectedCount.textContent = `已選 ${state.selected.size} / ${state.jobs.length} 個職缺進行比較`;
}

// ─── Field Filter Rendering ───────────────────────────────────────
function renderFieldFilter() {
    if (state.jobs.length === 0) {
        dom.fieldFilter.classList.add('hidden');
        return;
    }
    dom.fieldFilter.classList.remove('hidden');

    dom.fieldChips.innerHTML = '';
    FIELD_DEFS.forEach(field => {
        const chip = document.createElement('button');
        const isActive = state.visibleFields.has(field.key);
        chip.className = `field-chip${isActive ? ' active' : ''}`;
        chip.innerHTML = `<span class="field-chip-icon">${field.icon}</span>${field.label}`;
        chip.addEventListener('click', () => {
            if (state.visibleFields.has(field.key)) {
                state.visibleFields.delete(field.key);
            } else {
                state.visibleFields.add(field.key);
            }
            saveToStorage();
            render();
        });
        dom.fieldChips.appendChild(chip);
    });
}

function renderCards() {
    const grid = dom.jobsGrid;
    grid.innerHTML = '';

    const selectedJobs = getSelectedJobs();

    if (state.jobs.length === 0) {
        dom.emptyState.classList.remove('hidden');
        return;
    }

    dom.emptyState.classList.add('hidden');

    if (selectedJobs.length === 0) {
        grid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column:1/-1;">
      <p style="font-size:1.1rem;">👆 請在上方勾選要比較的職缺</p>
    </div>`;
        return;
    }

    // Find common skills across selected jobs
    const commonSkills = getCommonSkills();

    selectedJobs.forEach((job, index) => {
        const originalIndex = state.jobs.indexOf(job);
        const card = createJobCard(job, originalIndex, commonSkills);
        grid.appendChild(card);
    });
}

function getFieldValue(job, key) {
    switch (key) {
        case 'salary': return job.salary || '面議';
        case 'location': return job.location + (job.locationDetail ? '\n' + job.locationDetail : '');
        case 'experience': return job.experience || '不拘';
        case 'education': return job.education || '不拘';
        case 'welfare': return job.welfareText || '';
        case 'others': return job.others || '';
        case 'jobDescription': return job.jobDescription || '';
        default: return '';
    }
}

function createJobCard(job, index, commonSkills) {
    const colorClass = CARD_COLORS[index % CARD_COLORS.length];
    const vis = state.visibleFields;

    const card = document.createElement('div');
    card.className = 'job-card';
    card.id = `job-card-${job.jobId}`;

    // Build info items based on visible fields
    let infoHtml = '';
    const infoFields = FIELD_DEFS.filter(f => f.type === 'info' && vis.has(f.key));
    infoFields.forEach(field => {
        const value = getFieldValue(job, field.key);
        const isSalary = field.key === 'salary';
        const isLocation = field.key === 'location';
        let displayVal;

        if (isLocation) {
            displayVal = escapeHtml(job.location) +
                (job.locationDetail ? '<br><span style="font-size:0.8rem;color:var(--text-muted)">' + escapeHtml(job.locationDetail) + '</span>' : '');
        } else {
            displayVal = escapeHtml(value);
        }

        infoHtml += `
        <div class="info-item">
          <div class="info-icon ${field.cssClass || ''}">${field.icon}</div>
          <div class="info-content">
            <div class="info-label">${field.label}</div>
            <div class="info-value${isSalary ? ' salary-highlight' : ''}">${displayVal}</div>
          </div>
        </div>`;
    });

    // Build tags sections based on visible fields
    let tagsHtml = '';
    if (vis.has('skills') && job.skills.length > 0) {
        tagsHtml += `
        <div class="tags-title">🏷️ 技能要求</div>
        <div class="tags-container">
          ${job.skills.map(s => `<span class="tag skill ${commonSkills.has(s.toLowerCase()) ? 'common' : ''}">${escapeHtml(s)}</span>`).join('')}
        </div>`;
    }
    if (vis.has('tools') && job.tools.length > 0) {
        tagsHtml += `
        <div class="tags-title" style="margin-top:12px">🔧 工具</div>
        <div class="tags-container">
          ${job.tools.map(t => `<span class="tag tool ${commonSkills.has(t.toLowerCase()) ? 'common' : ''}">${escapeHtml(t)}</span>`).join('')}
        </div>`;
    }
    if (vis.has('languages') && job.languages.length > 0) {
        tagsHtml += `
        <div class="tags-title" style="margin-top:12px">🌐 語言能力</div>
        <div class="tags-container">
          ${job.languages.map(l => `<span class="tag language">${escapeHtml(l)}</span>`).join('')}
        </div>`;
    }

    // Detected skills from job description
    if (vis.has('detectedSkills')) {
        const detected = detectSkillsFromDescription(job);
        if (detected.length > 0) {
            const commonDetected = getCommonDetectedSkills();
            tagsHtml += `
            <div class="tags-title" style="margin-top:12px">📎 從工作內容偵測</div>
            <div class="tags-container">
              ${detected.map(s => `<span class="tag detected ${commonDetected.has(s.toLowerCase()) ? 'common' : ''}">${escapeHtml(s)}</span>`).join('')}
            </div>`;
        }
    }

    // Build text sections (job description, welfare)
    let textHtml = '';
    const textFields = FIELD_DEFS.filter(f => f.type === 'text' && vis.has(f.key));
    textFields.forEach(field => {
        const value = getFieldValue(job, field.key);
        if (!value) return;
        textHtml += `
        <div class="job-desc-section">
          <button class="job-desc-toggle" onclick="toggleDesc(this)">
            <span class="arrow">▶</span> ${field.icon} ${field.label}
          </button>
          <div class="job-desc-content hidden">${escapeHtml(value)}</div>
        </div>`;
    });

    card.innerHTML = `
    <div class="card-header">
      <div class="card-color-bar ${colorClass}"></div>
      <div class="card-title-row">
        <div class="card-title">
          <a href="${job.url}" target="_blank" title="在 104 上查看">${escapeHtml(job.title)}</a>
        </div>
        <button class="card-remove" onclick="removeJob('${job.jobId}')" title="移除">✕</button>
      </div>
      <div class="card-company">
        ${job.companyUrl
            ? `<a href="${job.companyUrl}" target="_blank">${escapeHtml(job.company)}</a>`
            : escapeHtml(job.company)}
        ${job.updateDate ? `<span style="margin-left: 8px; font-size: 0.75rem; color: var(--text-muted);">更新 ${job.updateDate}</span>` : ''}
      </div>
    </div>
    <div class="card-body">
      ${infoHtml ? `<div class="info-grid">${infoHtml}</div>` : ''}
      ${tagsHtml ? `<div class="tags-section">${tagsHtml}</div>` : ''}
      ${textHtml}
    </div>
  `;

    return card;
}

function renderStats() {
    const selectedJobs = getSelectedJobs();

    if (selectedJobs.length === 0) {
        dom.statsBar.classList.add('hidden');
        return;
    }

    dom.statsBar.classList.remove('hidden');
    dom.statCount.textContent = selectedJobs.length;

    // Max salary
    const salaries = selectedJobs.map(j => {
        const nums = j.salary.match(/[\d,]+/g);
        if (nums) {
            return Math.max(...nums.map(n => parseInt(n.replace(/,/g, ''), 10)));
        }
        return 0;
    });
    const maxSalary = Math.max(...salaries);
    dom.statMaxSalary.textContent = maxSalary > 0 ? `${(maxSalary).toLocaleString()}` : '面議';

    // Common skills
    const common = getCommonSkills();
    dom.statCommonSkills.textContent = common.size > 0 ? `${common.size} 個` : '無';

    // Locations
    const locations = [...new Set(selectedJobs.map(j => {
        const m = j.location.match(/(.{2,3}[市縣])/);
        return m ? m[1] : j.location;
    }))];
    dom.statLocations.textContent = locations.length > 0 ? locations.join('、') : '-';
}

function renderComparisonMatrix() {
    const selectedJobs = getSelectedJobs();
    const vis = state.visibleFields;

    if (selectedJobs.length < 2) {
        dom.skillSummary.classList.add('hidden');
        return;
    }

    dom.skillSummary.classList.remove('hidden');

    const thColors = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#38bdf8', '#fbbf24'];
    const jobHeaders = selectedJobs.map((j) => {
        const origIdx = state.jobs.indexOf(j);
        return `<th style="max-width: 160px; word-break: break-all;"><span style="color: ${thColors[origIdx % 6]}">${escapeHtml(truncate(j.title, 14))}</span></th>`;
    }).join('');

    let html = `<table class="skill-matrix-table">
    <thead>
      <tr>
        <th>比較項目</th>
        ${jobHeaders}
      </tr>
    </thead>
    <tbody>`;

    // ── Info fields as rows ──
    const infoFields = FIELD_DEFS.filter(f => f.type === 'info' && vis.has(f.key));
    infoFields.forEach(field => {
        html += `<tr>
      <td><span class="skill-name">${field.icon} ${field.label}</span></td>
      ${selectedJobs.map(j => {
            const val = getFieldValue(j, field.key).replace(/\n/g, '<br>');
            return `<td style="font-size:0.84rem;">${val || '<span style="opacity:0.3">—</span>'}</td>`;
        }).join('')}
    </tr>`;
    });

    // ── Skill / Tool tags as ✓/— rows ──
    const showSkills = vis.has('skills');
    const showTools = vis.has('tools');
    const showLangs = vis.has('languages');

    if (showSkills || showTools) {
        // Section divider
        html += `<tr><td colspan="${selectedJobs.length + 1}" style="padding:12px 14px 6px; font-size:0.78rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--glass-border);">🏷️ 技能 / 工具 對照</td></tr>`;

        const allSkillMap = new Map();
        selectedJobs.forEach(job => {
            const combined = [
                ...(showSkills ? job.skills : []),
                ...(showTools ? job.tools : []),
            ];
            combined.forEach(s => {
                const key = s.toLowerCase();
                if (!allSkillMap.has(key)) {
                    allSkillMap.set(key, { name: s, jobs: new Set() });
                }
                allSkillMap.get(key).jobs.add(job.jobId);
            });
        });

        const sorted = [...allSkillMap.values()].sort((a, b) => {
            if (b.jobs.size !== a.jobs.size) return b.jobs.size - a.jobs.size;
            return a.name.localeCompare(b.name);
        });

        sorted.forEach(item => {
            const isCommon = item.jobs.size === selectedJobs.length;
            html += `<tr>
          <td><span class="skill-name ${isCommon ? 'skill-common' : ''}">${escapeHtml(item.name)}${isCommon ? ' ⭐' : ''}</span></td>
          ${selectedJobs.map(j => {
                const has = item.jobs.has(j.jobId);
                return `<td><span class="skill-check ${has ? 'has' : 'missing'}">${has ? '✓' : '—'}</span></td>`;
            }).join('')}
        </tr>`;
        });
    }

    // ── Language rows ──
    if (showLangs) {
        html += `<tr><td colspan="${selectedJobs.length + 1}" style="padding:12px 14px 6px; font-size:0.78rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--glass-border);">🌐 語言能力</td></tr>`;

        const allLangs = new Map();
        selectedJobs.forEach(job => {
            job.languages.forEach(l => {
                const key = l.toLowerCase();
                if (!allLangs.has(key)) {
                    allLangs.set(key, { name: l, jobs: new Set() });
                }
                allLangs.get(key).jobs.add(job.jobId);
            });
        });

        [...allLangs.values()].sort((a, b) => b.jobs.size - a.jobs.size || a.name.localeCompare(b.name))
            .forEach(item => {
                const isCommon = item.jobs.size === selectedJobs.length;
                html += `<tr>
              <td><span class="skill-name ${isCommon ? 'skill-common' : ''}">${escapeHtml(item.name)}${isCommon ? ' ⭐' : ''}</span></td>
              ${selectedJobs.map(j => {
                    const has = item.jobs.has(j.jobId);
                    return `<td><span class="skill-check ${has ? 'has' : 'missing'}">${has ? '✓' : '—'}</span></td>`;
                }).join('')}
            </tr>`;
            });
    }

    // ── Detected skills rows ──
    const showDetected = vis.has('detectedSkills');
    if (showDetected) {
        const allDetectedMap = new Map();
        selectedJobs.forEach(job => {
            const detected = detectSkillsFromDescription(job);
            detected.forEach(s => {
                const key = s.toLowerCase();
                if (!allDetectedMap.has(key)) {
                    allDetectedMap.set(key, { name: s, jobs: new Set() });
                }
                allDetectedMap.get(key).jobs.add(job.jobId);
            });
        });

        const sortedDetected = [...allDetectedMap.values()].sort((a, b) => {
            if (b.jobs.size !== a.jobs.size) return b.jobs.size - a.jobs.size;
            return a.name.localeCompare(b.name);
        });

        if (sortedDetected.length > 0) {
            html += `<tr><td colspan="${selectedJobs.length + 1}" style="padding:12px 14px 6px; font-size:0.78rem; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--glass-border);">📎 從工作內容偵測</td></tr>`;

            sortedDetected.forEach(item => {
                const isCommon = item.jobs.size === selectedJobs.length;
                html += `<tr>
              <td><span class="skill-name ${isCommon ? 'skill-common' : ''}" style="color: #fbbf24">${escapeHtml(item.name)}${isCommon ? ' ⭐' : ''}</span></td>
              ${selectedJobs.map(j => {
                    const has = item.jobs.has(j.jobId);
                    return `<td><span class="skill-check ${has ? 'has' : 'missing'}">${has ? '✓' : '—'}</span></td>`;
                }).join('')}
            </tr>`;
            });
        }
    }

    html += '</tbody></table>';

    // Check if we have any content at all
    const hasInfoRows = infoFields.length > 0;
    const hasTagRows = (showSkills || showTools) || showLangs || showDetected;
    if (!hasInfoRows && !hasTagRows) {
        dom.skillSummary.classList.add('hidden');
        return;
    }

    dom.skillMatrix.innerHTML = html;
}

// ─── Helpers ──────────────────────────────────────────────────────
function getCommonSkills() {
    const selectedJobs = getSelectedJobs();
    if (selectedJobs.length < 2) return new Set();

    const skillSets = selectedJobs.map(j =>
        new Set([...j.skills, ...j.tools].map(s => s.toLowerCase()))
    );

    const common = new Set();
    skillSets[0].forEach(skill => {
        if (skillSets.every(set => set.has(skill))) {
            common.add(skill);
        }
    });

    return common;
}

function getCommonDetectedSkills() {
    const selectedJobs = getSelectedJobs();
    if (selectedJobs.length < 2) return new Set();

    const detectedSets = selectedJobs.map(j =>
        new Set(detectSkillsFromDescription(j).map(s => s.toLowerCase()))
    );

    const common = new Set();
    detectedSets[0].forEach(skill => {
        if (detectedSets.every(set => set.has(skill))) {
            common.add(skill);
        }
    });

    return common;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function setLoading(loading) {
    dom.addBtn.disabled = loading;
    dom.btnText.classList.toggle('hidden', loading);
    dom.btnLoading.classList.toggle('hidden', !loading);
}

function showError(msg) {
    dom.inputError.textContent = msg;
    dom.inputError.classList.remove('hidden');
}

function hideError() {
    dom.inputError.classList.add('hidden');
}

function updateCountTag() {
    dom.jobCountTag.textContent = `📊 目前 ${state.jobs.length} 個職缺`;
}

function showToast(msg, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function toggleDesc(btn) {
    btn.classList.toggle('open');
    const content = btn.nextElementSibling;
    content.classList.toggle('hidden');
}

// ─── Storage ──────────────────────────────────────────────────────
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.jobs));
        localStorage.setItem(STORAGE_SELECTED_KEY, JSON.stringify([...state.selected]));
        localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify([...state.visibleFields]));
        localStorage.setItem(STORAGE_KEYWORDS_KEY, JSON.stringify(state.customKeywords));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            state.jobs = JSON.parse(data);
            // Auto-repair old data
            let needsSave = false;
            state.jobs.forEach(job => {
                // Fix companyUrl with double https
                if (job.companyUrl && !job.companyUrl.match(/^https:\/\/[^/]/)) {
                    job.companyUrl = job.companyUrl
                        ? 'https://' + job.companyUrl.replace(/^(https?:?\/?\/?)*/g, '')
                        : '';
                    needsSave = true;
                }
                // Fix language [object Object]
                if (Array.isArray(job.languages)) {
                    job.languages = job.languages.map(l => {
                        if (typeof l === 'string' && l.includes('[object Object]')) {
                            return l.replace(/\[object Object\]/g, '').replace(/[()]\s*/g, '').trim() || '語言';
                        }
                        return l;
                    });
                    needsSave = true;
                }
            });
            if (needsSave) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.jobs));
            }
        }
        const selectedData = localStorage.getItem(STORAGE_SELECTED_KEY);
        if (selectedData) {
            const arr = JSON.parse(selectedData);
            state.selected = new Set(arr);
            const jobIds = new Set(state.jobs.map(j => j.jobId));
            state.selected.forEach(id => {
                if (!jobIds.has(id)) state.selected.delete(id);
            });
        }
        const fieldsData = localStorage.getItem(STORAGE_FIELDS_KEY);
        if (fieldsData) {
            state.visibleFields = new Set(JSON.parse(fieldsData));
        }
        const kwData = localStorage.getItem(STORAGE_KEYWORDS_KEY);
        if (kwData) {
            state.customKeywords = JSON.parse(kwData);
        }
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
}

// ─── CSV Export ───────────────────────────────────────────────────
function csvEscape(val) {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function exportCSV() {
    const selectedJobs = getSelectedJobs();
    if (selectedJobs.length === 0) {
        showToast('⚠️ 請先勾選要匯出的職缺');
        return;
    }

    const headers = [
        '職缺名稱', '公司名稱', '職缺連結', '公司連結',
        '薪資待遇', '工作地點', '地址', '經歷要求', '學歷要求',
        '技能要求', '工具', '語言能力', '偵測技能（從工作內容）',
        '工作內容', '福利', '其他條件', '更新日期'
    ];

    const rows = selectedJobs.map(job => {
        const detected = detectSkillsFromDescription(job);
        return [
            job.title,
            job.company,
            job.url,
            job.companyUrl,
            job.salary,
            job.location,
            job.locationDetail,
            job.experience,
            job.education,
            (job.skills || []).join('、'),
            (job.tools || []).join('、'),
            (job.languages || []).join('、'),
            detected.join('、'),
            job.jobDescription,
            job.welfareText,
            job.others,
            job.updateDate,
        ].map(csvEscape);
    });

    // UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const csvContent = bom + [headers.map(csvEscape).join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `104職缺比較_${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`✅ 已匯出 ${selectedJobs.length} 個職缺的 CSV`);
}

// ─── Event Listeners ──────────────────────────────────────────────
document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

dom.addBtn.addEventListener('click', () => {
    const val = dom.input.value.trim();
    if (!val) return;
    addJobsBatch(val);
});

dom.input.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const val = dom.input.value.trim();
        if (!val) return;
        addJobsBatch(val);
    }
});

dom.input.addEventListener('input', hideError);

// Select All / Deselect All
dom.selectAllBtn.addEventListener('click', selectAll);
dom.deselectAllBtn.addEventListener('click', deselectAll);

// Custom Keywords
dom.addKeywordBtn.addEventListener('click', () => {
    const val = dom.keywordInput.value;
    // Support comma-separated input
    val.split(/[,，、]/).forEach(kw => addCustomKeyword(kw));
    dom.keywordInput.value = '';
});

dom.keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = dom.keywordInput.value;
        val.split(/[,，、]/).forEach(kw => addCustomKeyword(kw));
        dom.keywordInput.value = '';
    }
});

// Demo buttons
document.querySelectorAll('.demo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        dom.input.value = url;
        addJob(url);
    });
});

// ─── Init ─────────────────────────────────────────────────────────
loadFromStorage();
render();

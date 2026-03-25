/**
 * 設定: Cloud Run Functions の URL をここに貼り付けてください
 */
const API_URL = "YOUR_CLOUD_RUN_FUNCTIONS_URL";

document.addEventListener('DOMContentLoaded', () => {
    // 時・分のプルダウンを生成
    initTimeSelects();

    // 初期表示の生成（1つずつ）
    addAgendaRow();
    addMemberInput('dd-member-list');

    // イベントリスナーの登録
    document.getElementById('add-agenda').addEventListener('click', addAgendaRow);
    document.getElementById('add-external-org').addEventListener('click', addExternalOrgBlock);
    document.getElementById('generate-btn').addEventListener('click', generateMinutes);
    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
});

function initTimeSelects() {
    const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
    const mins = ['00', '15', '30', '45'];

    const hSelects = ['start-hour', 'end-hour'];
    const mSelects = ['start-min', 'end-min'];

    hSelects.forEach(id => {
        const el = document.getElementById(id);
        hours.forEach(h => el.add(new Option(h, h)));
    });
    mSelects.forEach(id => {
        const el = document.getElementById(id);
        mins.forEach(m => el.add(new Option(m, m)));
    });
    
    // デフォルト値（例：10:00 〜 11:00）
    document.getElementById('start-hour').value = '10';
    document.getElementById('end-hour').value = '11';
}

/**
 * アジェンダ行を追加
 */
function addAgendaRow() {
    const container = document.getElementById('agenda-container');
    const div = document.createElement('div');
    div.className = 'input-row';
    div.innerHTML = `
        <input type="text" class="agenda-item" placeholder="議題を入力">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

/**
 * メンバー個人の入力欄を追加
 * CSSで .member-name-input の幅を制限するためにクラスを付与
 */
function addMemberInput(containerId) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'input-row';
    div.innerHTML = `
        <input type="text" class="member-name-input" placeholder="氏名">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

/**
 * 社外（Client/Vendor）の組織ブロックを追加
 */
function addExternalOrgBlock() {
    const container = document.getElementById('external-org-container');
    const orgId = 'org-' + Date.now();
    const div = document.createElement('div');
    div.className = 'external-org-block';
    
    div.innerHTML = `
        <div class="input-row">
            <input type="text" class="org-name-input" placeholder="会社名">
            <button type="button" class="btn-remove" onclick="this.closest('.external-org-block').remove()" title="この組織を削除">✕</button>
        </div>

        <div id="${orgId}"></div> 
        
        <div class="list-footer">
            <span class="btn-add-mini" onclick="addMemberInput('${orgId}')">+ メンバーを追加</span>
        </div>
    `;
    
    container.appendChild(div);
    addMemberInput(orgId); 
}

/**
 * 通信・コピー・テキスト取得ロジック（ここからは変更なし）
 */
async function getVttText() {
    const fileInput = document.getElementById('vtt-file');
    const rawText = document.getElementById('vtt-raw').value;
    if (fileInput.files.length > 0) {
        return await fileInput.files[0].text();
    }
    return rawText;
}

// データ収集 (generateMinutes関数内)
async function generateMinutes() {
    // ... バリデーション ...

    // 日付と各プルダウンの値を結合して「2026/03/25 10:00 - 11:00」の形式にする
    const date = document.getElementById('meeting-date').value.replace(/-/g, '/');
    const sH = document.getElementById('start-hour').value;
    const sM = document.getElementById('start-min').value;
    const eH = document.getElementById('end-hour').value;
    const eM = document.getElementById('end-min').value;
    
    const meetingDate = `${date} ${sH}:${sM} - ${eH}:${eM}`;
}

function copyToClipboard() {
    const outputText = document.getElementById('output-text').innerText;
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalText = btn.innerText;
        btn.innerText = 'コピー完了！';
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

async function generateMinutes() {
    const btn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const outputText = document.getElementById('output-text');

    const vttText = await getVttText();
    if (!vttText) {
        alert('文字起こしデータ(VTT)を入力またはアップロードしてください。');
        return;
    }

    btn.disabled = true;
    btn.innerText = '議事録を生成中... (約30〜60秒)';

    try {
        // --- ★ここから修正：5つのパーツを合体させる ---
        const dateInput = document.getElementById('meeting-date').value; // "2026-03-25"
        if (!dateInput) {
            alert('開催日時を選択してください。');
            btn.disabled = false;
            btn.innerText = '議事録を生成する';
            return;
        }

        const startH = document.getElementById('start-hour').value;
        const startM = document.getElementById('start-min').value;
        const endH = document.getElementById('end-hour').value;
        const endM = document.getElementById('end-min').value;

        // ハイフンをスラッシュに変えて、時間を繋げる
        // 例: "2026/03/25 10:00 - 11:15"
        const formattedDate = dateInput.replace(/-/g, '/');
        const meetingDate = `${formattedDate} ${startH}:${startM} - ${endH}:${endM}`;
        // --- ★修正ここまで ---

        const agendas = Array.from(document.querySelectorAll('.agenda-item'))
                            .map(input => input.value.trim())
                            .filter(v => v !== '');

        const members = [];
        document.querySelectorAll('#dd-member-list .member-name-input').forEach(input => {
            const name = input.value.trim();
            if (name) members.push({ name: name, org: 'DD', type: 'DD' });
        });

        document.querySelectorAll('.external-org-block').forEach(block => {
            const orgName = block.querySelector('.org-name-input').value.trim() || '社外';
            const type = orgName.toLowerCase().includes('client') ? 'Client' : 'Vendor';
            block.querySelectorAll('.member-name-input').forEach(input => {
                const name = input.value.trim();
                if (name) members.push({ name: name, org: orgName, type: type });
            });
        });

        const payload = {
            vtt_text: vttText,
            meeting_date: meetingDate,
            agendas: agendas,
            members: members
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API実行エラー');
        }

        const result = await response.json();
        outputText.innerText = result.markdown;
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert('エラーが発生しました: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = '議事録を生成する';
    }
}
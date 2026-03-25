/**
 * 設定: Cloud Run Functions の URL をここに貼り付けてください
 */
const API_URL = "YOUR_CLOUD_RUN_FUNCTIONS_URL";

document.addEventListener('DOMContentLoaded', () => {
    // 初期表示の生成（1つずつ）
    addAgendaRow();
    addMemberInput('dd-member-list');

    // イベントリスナーの登録
    document.getElementById('add-agenda').addEventListener('click', addAgendaRow);
    document.getElementById('add-external-org').addEventListener('click', addExternalOrgBlock);
    document.getElementById('generate-btn').addEventListener('click', generateMinutes);
    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
});

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
        const meetingDate = document.getElementById('meeting-date').value;
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
/**
 * 設定: Cloud Run Functions の URL をここに貼り付けてください
 * 例: https://us-central1-ga-export-262309.cloudfunctions.net/handle_summarize
 */
const API_URL = "YOUR_CLOUD_RUN_FUNCTIONS_URL";

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初期表示で自社(DD)の入力欄を1つ用意
    addMemberInput('dd-member-list');

    // 2. 初期表示でアジェンダの入力欄を1つだけ用意（ここ！）
    addAgendaRow();

    // 3. イベントリスナーの登録
    document.getElementById('add-agenda').addEventListener('click', addAgendaRow);
    document.getElementById('add-external-org').addEventListener('click', addExternalOrgBlock);
    document.getElementById('generate-btn').addEventListener('click', generateMinutes);
    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
});

/**
 * アジェンダ行を追加する
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
 * メンバー個人の入力チップ（氏名）を追加する
 * @param {string} containerId - 追加先のDOM ID
 */
function addMemberInput(containerId) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'input-row'; // クラスを統一
    div.innerHTML = `
        <input type="text" class="member-name-input" placeholder="氏名">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

/**
 * 社外（Client/Vendor）の組織ブロックを追加する
 */
function addExternalOrgBlock() {
    const container = document.getElementById('external-org-container');
    const orgId = 'org-' + Date.now();
    const div = document.createElement('div');
    div.className = 'external-org-block';
    
    div.innerHTML = `
        <div class="input-row">
            <input type="text" class="org-name-input" placeholder="会社名">
            <button type="button" class="btn-org-remove" onclick="this.closest('.external-org-block').remove()" title="この組織を削除">✕</button>
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
 * VTTテキストを取得する（ファイル優先、なければテキストエリア）
 */
async function getVttText() {
    const fileInput = document.getElementById('vtt-file');
    const rawText = document.getElementById('vtt-raw').value;

    if (fileInput.files.length > 0) {
        return await fileInput.files[0].text();
    }
    return rawText;
}

/**
 * クリップボードにコピー
 */
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

/**
 * メイン処理: 入力情報を収集してAPIへ送信
 */
// --- メイン処理: 入力情報を収集してAPIへ送信 ---
async function generateMinutes() {
    const btn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const outputText = document.getElementById('output-text');

    // 1. バリデーション (ここが最初)
    const vttText = await getVttText();
    if (!vttText) {
        alert('文字起こしデータ(VTT)を入力またはアップロードしてください。');
        return;
    }

    // 2. 処理開始状態へ
    btn.disabled = true;
    btn.innerText = '議事録を生成中... (約30〜60秒)';

    try {
        // ★ここからデータ収集を開始！★
        const meetingDate = document.getElementById('meeting-date').value;
        const agendas = Array.from(document.querySelectorAll('.agenda-item'))
                            .map(input => input.value.trim())
                            .filter(v => v !== '');

        const members = [];

        // 自社(DD)メンバーの収集
        document.querySelectorAll('#dd-member-list .member-name-input').forEach(input => {
            const name = input.value.trim();
            if (name) {
                members.push({ name: name, org: 'DD', type: 'DD' });
            }
        });

        // 社外(Client/Vendor)メンバーの収集
        document.querySelectorAll('.external-org-block').forEach(block => {
            const orgName = block.querySelector('.org-name-input').value.trim() || '社外';
            const type = orgName.toLowerCase().includes('client') ? 'Client' : 'Vendor';
            
            block.querySelectorAll('.member-name-input').forEach(input => {
                const name = input.value.trim();
                if (name) {
                    members.push({ name: name, org: orgName, type: type });
                }
            });
        });
        // ★データ収集はここまで★

        // 3. リクエスト送信 (この後、APIを叩く処理に続く)
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

        // 4. 結果の反映
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
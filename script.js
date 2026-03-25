// --- 設定：デプロイした Cloud Run Functions の URL に書き換えてください ---
const API_URL = "https://YOUR-REGION-YOUR-PROJECT.a.run.app/handle_summarize";

document.addEventListener('DOMContentLoaded', () => {
    // 初期状態でメンバー入力欄を1つ追加しておく
    addMemberRow();

    // イベントリスナーの設定
    document.getElementById('add-agenda').addEventListener('click', addAgendaRow);
    document.getElementById('add-member').addEventListener('click', addMemberRow);
    document.getElementById('generate-btn').addEventListener('click', generateMinutes);
    document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
});

// アジェンダ行の追加
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

// メンバー行の追加 (DD / Client / Vendor の切り替え対応)
function addMemberRow() {
    const container = document.getElementById('member-container');
    const div = document.createElement('div');
    div.className = 'input-row member-row';
    div.innerHTML = `
        <select class="member-type" onchange="toggleOrgInput(this)">
            <option value="Client">Client</option>
            <option value="DD">DD (自社)</option>
            <option value="Vendor">Vendor (他社)</option>
        </select>
        <input type="text" class="member-org" placeholder="組織名" style="display:none;">
        <input type="text" class="member-name" placeholder="氏名">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

// Vendorが選ばれた時だけ組織名入力を表示
function toggleOrgInput(select) {
    const orgInput = select.parentElement.querySelector('.member-org');
    if (select.value === 'Vendor') {
        orgInput.style.display = 'block';
        orgInput.placeholder = 'ベンダー社名';
    } else {
        orgInput.style.display = 'none';
        orgInput.value = ''; // Client/DDの場合は空にする
    }
}

// VTTファイルの読み込み処理
async function getVttText() {
    const fileInput = document.getElementById('vtt-file');
    const rawText = document.getElementById('vtt-raw').value;

    if (fileInput.files.length > 0) {
        return await fileInput.files[0].text();
    }
    return rawText;
}

// クリップボードコピー
function copyToClipboard() {
    const text = document.getElementById('output-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.innerText = 'コピーしました！';
        setTimeout(() => btn.innerText = 'クリップボードにコピー', 2000);
    });
}

// --- メイン処理：API送信 ---
async function generateMinutes() {
    const btn = document.getElementById('generate-btn');
    const outputSection = document.getElementById('result-section');
    const outputText = document.getElementById('output-text');

    // ボタンの無効化（二重送信防止）
    btn.disabled = true;
    btn.innerText = '生成中... (30秒ほどかかります)';

    try {
        const vttText = await getVttText();
        if (!vttText) {
            alert('VTTデータまたはファイルを入力してください。');
            return;
        }

        // データの収集
        const meetingDate = document.getElementById('meeting-date').value;
        const agendas = Array.from(document.querySelectorAll('.agenda-item'))
                            .map(input => input.value)
                            .filter(v => v !== '');
        
        const members = Array.from(document.querySelectorAll('.member-row')).map(row => {
            const type = row.querySelector('.member-type').value;
            let org = type; // Client or DD
            if (type === 'Vendor') {
                org = row.querySelector('.member-org').value || 'Vendor';
            }
            return {
                name: row.querySelector('.member-name').value,
                org: org,
                type: type
            };
        }).filter(m => m.name !== '');

        // JSONリクエストの作成
        const payload = {
            vtt_text: vttText,
            meeting_date: meetingDate,
            agendas: agendas,
            members: members
        };

        // API呼び出し
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('サーバーエラーが発生しました。');

        const result = await response.json();
        
        // 結果の表示
        outputText.innerText = result.markdown;
        outputSection.style.display = 'block';
        outputSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        alert('エラーが発生しました: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = '議事録を生成する';
    }
}
// js/comments.js
// サーバーは変更しない前提。APIの形式差に強い最小実装。
const API_BASE = 'https://howasaba-code.com/wp-json/psr/v1';
const POST_ID = 103; // 必要なら後で変更

// 指紋（1端末=1識別子）: いいね等の将来機能にも使える
const FP_KEY = 'psr_fp';
let fp = localStorage.getItem(FP_KEY);
if (!fp) { fp = Math.random().toString(36).slice(2); localStorage.setItem(FP_KEY, fp); }

const els = {
  status: document.getElementById('commentStatus'),
  list: document.getElementById('commentList'),
  more: document.getElementById('commentMore'),
  form: document.getElementById('commentForm'),
  name: document.getElementById('commentName'),
  email: document.getElementById('commentEmail'),
  msg: document.getElementById('commentMessage'),
};

let page = 1;
let perPage = 20;
let total = 0;

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

// サーバー実装の違いに耐性を持たせる正規化
function normalize(c){
  const id = c.id ?? c.comment_id ?? c.comment_ID ?? 0;
  const author = c.author ?? c.author_name ?? c.comment_author ?? 'ゲスト';
  const content = (c.content && (c.content.rendered ?? c.content)) ?? c.comment_content ?? '';
  const date = c.date_gmt ?? c.date ?? c.comment_date_gmt ?? new Date().toISOString();
  return { id, author, content, date };
}

function itemHTML(c){
  return `
    <li class="commentItem" data-id="${c.id}">
      <div class="commentMeta">
        <strong class="commentAuthor">${esc(c.author)}</strong>
        <time datetime="${esc(c.date)}">${new Date(c.date).toLocaleString()}</time>
      </div>
      <p class="commentContent">${esc(c.content)}</p>
    </li>`;
}

async function fetchComments(nextPage = 1){
  if (!els.list) return;
  els.status.textContent = '読み込み中…';
  try {
    const url = `${API_BASE}/comments?post_id=${POST_ID}&page=${nextPage}&per_page=${perPage}&order=desc&fingerprint=${encodeURIComponent(fp)}&_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    page = data.page ?? nextPage;
    perPage = data.per_page ?? perPage;
    total = data.total ?? (Array.isArray(data) ? data.length : 0);

    const rows = (data.comments ?? data ?? []).map(normalize);
    if (nextPage === 1) els.list.innerHTML = '';
    els.list.insertAdjacentHTML('beforeend', rows.map(itemHTML).join(''));
    els.status.textContent = rows.length ? '' : (nextPage === 1 ? 'まだコメントはありません。' : '');
    els.more.hidden = (page * perPage >= total) || total === 0;
  } catch (err) {
    console.error(err);
    els.status.textContent = '読み込みに失敗しました。';
  }
}

async function postComment(author, content, email){
  const body = {
    author, content,
    post_id: POST_ID,
    fingerprint: fp,
    meta: { email: email || '' },
  };
  const res = await fetch(`${API_BASE}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalize(await res.json());
}

// 送信（楽観更新＋エラーハンドリング）
els?.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const author = (els.name?.value || 'ゲスト').trim();
  const content = (els.msg?.value || '').trim();
  const email = (els.email?.value || '').trim();
  if (!content) { alert('コメントを入力してください。'); return; }

  const btn = els.form.querySelector('#commentSubmit');
  btn.disabled = true;
  try {
    const created = await postComment(author, content, email);
    els.msg.value = '';
    els.list.insertAdjacentHTML('afterbegin', itemHTML(created));
    els.status.textContent = '';
  } catch (err) {
    console.error(err);
    alert('送信に失敗しました。時間をおいて再度お試しください。');
  } finally {
    btn.disabled = false;
  }
});

// もっと見る
els?.more?.addEventListener('click', () => fetchComments(page + 1));

// オーバーレイを開いた時に読み込む（メニュー or リザルトから）
document.addEventListener('click', (ev) => {
  const id = (ev.target instanceof Element) ? ev.target.id : '';
  if (id === 'commentBtn' || id === 'resultComment') {
    page = 1;
    fetchComments(1);
  }
});

// ページ初回（保険）
document.addEventListener('DOMContentLoaded', () => fetchComments(1));

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  config: {
    duration: 29,
    fps: 30,
    image: '/assets/main.png',
    audio: '/assets/audio.mp3',
    creatorHandle: '@mybrand',
    captions: [],
  },
  orientation: 'landscape',
};

const captionsEl = $('#captions');

function renderCaptions() {
  captionsEl.innerHTML = '';
  state.config.captions.forEach((cap, i) => {
    const row = document.createElement('div');
    row.className = 'caption-row';
    row.innerHTML = `
      <div>
        <div class="label-row">start (s)</div>
        <input type="number" step="0.1" min="0" class="num-input" value="${cap.start}" data-key="start" data-idx="${i}" />
      </div>
      <div>
        <div class="label-row">end (s)</div>
        <input type="number" step="0.1" min="0" class="num-input" value="${cap.end}" data-key="end" data-idx="${i}" />
      </div>
      <div>
        <div class="label-row">text (use Enter for line breaks)</div>
        <textarea data-key="text" data-idx="${i}">${cap.text.replace(/</g, '&lt;')}</textarea>
      </div>
      <div style="align-self:end">
        <button class="btn danger small" data-action="del" data-idx="${i}">Remove</button>
      </div>
    `;
    captionsEl.appendChild(row);
  });
}

captionsEl.addEventListener('input', (e) => {
  const t = e.target;
  const idx = Number(t.dataset.idx);
  const key = t.dataset.key;
  if (Number.isNaN(idx) || !key) return;
  const value = key === 'text' ? t.value : Number(t.value);
  state.config.captions[idx][key] = value;
});

captionsEl.addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.action === 'del') {
    const idx = Number(t.dataset.idx);
    state.config.captions.splice(idx, 1);
    renderCaptions();
  }
});

$('#add-caption').addEventListener('click', () => {
  const last = state.config.captions[state.config.captions.length - 1];
  const start = last ? +(last.end + 0.1).toFixed(2) : 0;
  state.config.captions.push({start, end: start + 2.5, text: 'new phrase'});
  renderCaptions();
});

// asset uploads
$$('input[type="file"]').forEach((input) => {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {method: 'POST', body: fd});
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'upload failed');
      return;
    }
    const target = input.dataset.target;
    $('#' + target).value = data.path;
    syncFromInputs();
    refreshPreviews();
  });
});

function syncFromInputs() {
  state.config.image = $('#image-path').value.trim();
  state.config.audio = $('#audio-path').value.trim();
  state.config.creatorHandle = $('#handle').value.trim();
  state.config.duration = Number($('#duration').value);
  state.config.fps = Number($('#fps').value);
}

function syncToInputs() {
  $('#image-path').value = state.config.image || '';
  $('#audio-path').value = state.config.audio || '';
  $('#handle').value = state.config.creatorHandle || '';
  $('#duration').value = state.config.duration;
  $('#fps').value = state.config.fps;
}

function refreshPreviews() {
  const img = $('#image-preview');
  img.innerHTML = state.config.image
    ? `<img src="${state.config.image}" alt="preview" />`
    : '';
  const audio = $('#audio-preview');
  if (state.config.audio) {
    audio.src = state.config.audio;
    audio.style.display = '';
  } else {
    audio.removeAttribute('src');
    audio.style.display = 'none';
  }
}

['image-path', 'audio-path', 'handle', 'duration', 'fps'].forEach((id) => {
  $('#' + id).addEventListener('input', () => {
    syncFromInputs();
    refreshPreviews();
  });
});

// orientation toggle
$$('.seg-btn').forEach((b) =>
  b.addEventListener('click', () => {
    $$('.seg-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    state.orientation = b.dataset.orientation;
  })
);

// save
$('#save-btn').addEventListener('click', async () => {
  syncFromInputs();
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(state.config),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'save failed');
  flashLog('config saved.');
});

// render
$('#render-btn').addEventListener('click', async () => {
  syncFromInputs();
  // Save first so the active.json is up-to-date
  await fetch('/api/config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(state.config),
  });

  const player = $('#player');
  player.classList.remove('show');
  flashLog(`starting ${state.orientation} render…`);

  const res = await fetch('/api/render', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({orientation: state.orientation}),
  });
  if (!res.ok || !res.body) {
    flashLog('failed to start render');
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    buf += dec.decode(value, {stream: true});
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = chunk.split('\n');
      let event = 'message', data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      try {
        const parsed = JSON.parse(data);
        if (event === 'log') flashLog(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
        if (event === 'done') {
          flashLog('render complete → ' + parsed.url);
          player.src = parsed.url;
          player.classList.add('show');
          loadRecent();
        }
        if (event === 'error') flashLog('render failed (exit ' + parsed.code + ')');
      } catch {
        flashLog(data);
      }
    }
  }
});

function flashLog(msg) {
  const el = $('#logs');
  el.textContent += msg + (msg.endsWith('\n') ? '' : '\n');
  el.scrollTop = el.scrollHeight;
}

async function loadRecent() {
  const res = await fetch('/api/output/list');
  const list = await res.json();
  const el = $('#recent');
  el.innerHTML = '';
  list.slice(0, 10).forEach((f) => {
    const a = document.createElement('a');
    a.href = f.url;
    a.target = '_blank';
    const sizeMb = (f.size / 1e6).toFixed(1);
    a.textContent = `${f.name} — ${sizeMb} MB`;
    el.appendChild(a);
  });
}

async function init() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) state.config = await res.json();
  } catch {}
  if (!state.config.captions) state.config.captions = [];
  syncToInputs();
  refreshPreviews();
  renderCaptions();
  loadRecent();
}
init();

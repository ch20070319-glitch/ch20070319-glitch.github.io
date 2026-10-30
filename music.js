(() => {
  const $ = selector => document.querySelector(selector);
  const audio = $('#site-audio'), config = window.ASKER_MUSIC;
  const background = { name: 'Overjoy ★ OVERDOSE!!', artist: 'BilliumMoto/黑皇帝/Sobrem/Vally.exe', url: 'assets/music.mp3', cover: 'assets/album.webp', local: true };
  const local = { id: 'local', name: '原背景音乐', local: true, tracks: [background] };
  const library = new Map([['local', local]]), requests = new Map();
  const grouping = window.AskerPlaylistGroups, shelfSize = 8, trackSize = 30;
  let viewed = config.playlists[0]?.id || 'local', shelfFilter = 'all', shelfPage = 1, trackPage = 1;
  let queue = { id: 'local', name: local.name, tracks: [background] };
  let current = background, loop = 'all', messageTimer;
  function safeURL(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }
  config.playlists.forEach(item => {
    if (/^\d{1,20}$/.test(item.id) && /^music-data\/\d{1,20}\.js(?:\?v=[A-Za-z0-9_-]+)?$/.test(item.dataFile || '')) library.set(item.id, { ...item, tracks: null, error: '' });
  });
  if (!library.has(viewed)) viewed = 'local';
  function notify(message) { $('#music-feedback').textContent = message; clearTimeout(messageTimer); if (message) messageTimer = setTimeout(() => { $('#music-feedback').textContent = ''; }, 6500); }
  function formatTime(seconds) { return Number.isFinite(seconds) ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0') : '--:--'; }
  function playbackUI() {
    const playing = !audio.paused;
    $('#music-toggle').textContent = playing ? 'Ⅱ' : '▶';
    $('#music-toggle').setAttribute('aria-label', playing ? '暂停' : '播放');
    $('#music-page-play').textContent = playing ? '暂停播放 Ⅱ' : '播放这首歌 ↗';
  }
  async function play() { notify(''); try { await audio.play(); } catch (error) { if (error.name !== 'AbortError') notify('这首歌暂时无法播放，可切换歌曲、刷新歌单音源或到网易云收听。'); } }
  function toggle() { if (audio.paused) play(); else audio.pause(); }
  function paintCurrent() {
    $('#dock-title').textContent = $('#music-current-title').textContent = current.name;
    $('#dock-artist').textContent = $('#music-current-artist').textContent = current.artist;
    $('#dock-cover').src = $('#music-art').src = current.cover || background.cover;
    $('#music-art').alt = current.name + '封面';
    $('#queue-name').textContent = '正在播放的歌单：' + queue.name;
    $('#music-current-title').title = '当前播放队列：' + queue.name;
    playbackUI();
  }
  function select(track) {
    if (current !== track) { current = track; audio.src = track.url; $('#music-seek').value = '0'; $('#music-seek').disabled = true; $('#music-elapsed').textContent = '0:00'; $('#music-duration').textContent = '--:--'; }
    paintCurrent(); renderShelf(); renderTracks(); play();
  }
  function activate(playlist, track) { queue = { id: playlist.id, name: playlist.name, tracks: [...playlist.tracks] }; select(track || queue.tracks[0]); }
  function step(direction) { const index = queue.tracks.indexOf(current); select(queue.tracks[(Math.max(0, index) + direction + queue.tracks.length) % queue.tracks.length]); }
  function coverImage(src) { const image = document.createElement('img'); image.src = src || background.cover; image.alt = ''; image.referrerPolicy = 'no-referrer'; image.loading = 'lazy'; image.onerror = () => { image.onerror = null; image.src = background.cover; }; return image; }
  function pager(selector, total, page, size, change) {
    const container = $(selector), pages = Math.max(1, Math.ceil(total / size));
    container.hidden = total <= size;
    const content = document.createDocumentFragment();
    function button(text, target, disabled = false) {
      const item = document.createElement('button'); item.type = 'button'; item.textContent = text; item.disabled = disabled;
      item.onclick = () => change(target); content.append(item); return item;
    }
    button('← 上一页', page - 1, page <= 1);
    const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n >= 1 && n <= pages).sort((a,b) => a-b);
    let last = 0;
    numbers.forEach(number => {
      if (last && number - last > 1) { const dots = document.createElement('span'); dots.textContent = '…'; content.append(dots); }
      const item = button(String(number), number); item.setAttribute('aria-label', '第 ' + number + ' 页');
      if (number === page) item.setAttribute('aria-current', 'page'); last = number;
    });
    button('下一页 →', page + 1, page >= pages);
    const status = document.createElement('span'); status.className = 'pagination-info'; status.textContent = '第 ' + page + ' / ' + pages + ' 页 · 共 ' + total + ' 项'; content.append(status);
    container.replaceChildren(content);
  }
  function renderShelf() {
    const all = grouping.sorted(library.values());
    const years = [...new Map(all.map(playlist => grouping.group(playlist)).filter(Boolean).map(g => [g.key,g])).values()];
    const tabs = [{key:'all',label:'全部歌单'}, ...years.map(g => ({key:g.key,label:g.label})), {key:'other',label:'其他歌单'}];
    if (!tabs.some(tab => tab.key === shelfFilter)) { shelfFilter = 'all'; shelfPage = 1; }
    const tabContent = document.createDocumentFragment();
    tabs.forEach(tab => {
      const item = document.createElement('button'); item.type = 'button'; item.textContent = tab.label;
      item.setAttribute('aria-pressed', String(tab.key === shelfFilter));
      item.onclick = () => { shelfFilter = tab.key; shelfPage = 1; renderShelf(); };
      tabContent.append(item);
    });
    $('#playlist-groups').replaceChildren(tabContent);
    const filtered = all.filter(playlist => shelfFilter === 'all' || (shelfFilter === 'other' ? !grouping.group(playlist) : grouping.group(playlist)?.key === shelfFilter));
    shelfPage = Math.min(shelfPage, Math.max(1, Math.ceil(filtered.length / shelfSize)));
    const start = (shelfPage - 1) * shelfSize;
    const fragment = document.createDocumentFragment();
    filtered.slice(start, start + shelfSize).forEach((playlist, offset) => {
      const index = start + offset;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'playlist-card'; button.setAttribute('aria-pressed', String(playlist.id === viewed));
      const artwork = document.createElement('span'); artwork.className = 'playlist-artwork'; if (playlist.local || playlist.cover) { const cover = coverImage(playlist.local ? background.cover : playlist.cover); cover.alt = playlist.name + '的网易云歌单封面'; artwork.append(cover); } else { const placeholder = document.createElement('span'); placeholder.className = 'playlist-cover-placeholder'; placeholder.textContent = '♫'; placeholder.setAttribute('aria-label', '歌单封面暂未读取'); artwork.append(placeholder); }
      const label = document.createElement('span'); label.className = 'mono'; label.textContent = 'LIST / ' + String(index + 1).padStart(2, '0'); artwork.append(label);
      const name = document.createElement('strong'); name.textContent = playlist.name;
      const info = document.createElement('small'); info.textContent = (playlist.error ? '读取失败 · 点击重试' : (playlist.tracks ? playlist.tracks.length : playlist.trackCount || 0) + ' 首') + (queue.id === playlist.id ? ' · 当前播放队列' : '');
      button.append(artwork, name, info);
      button.onclick = () => { viewed = playlist.id; trackPage = 1; renderShelf(); renderTracks(); if (!playlist.local) { if (!playlist.tracks || playlist.error) loadPlaylist(playlist); } };
      fragment.append(button);
    });
    $('#library-count').textContent = String(library.size).padStart(2, '0'); $('#playlist-shelf').replaceChildren(fragment);
    pager('#playlist-pages', filtered.length, shelfPage, shelfSize, page => { shelfPage = page; renderShelf(); });
  }
  function renderTracks() {
    const playlist = library.get(viewed) || local, pending = requests.has(playlist.id);
    $('#playlist-view-title').textContent = playlist.name;
    $('#playlist-play').disabled = !playlist.tracks?.length || pending;
    $('#playlist-count').textContent = String(playlist.tracks?.length ?? playlist.trackCount ?? 0).padStart(2, '0') + ' / TRACKS';
    $('#playlist-source').hidden = !!playlist.local;
    $('#playlist-source').href = playlist.local ? '#' : 'https://music.163.com/#/playlist?id=' + playlist.id;
    $('#playlist-view-status').textContent = pending ? '正在读取歌曲，当前播放保持不变…' : playlist.error || (playlist.local ? '原网站背景音乐，已完整保留。' : playlist.tracks ? '点击歌曲可播放并切换到此歌单；仅浏览不会打断当前音乐。歌曲列表随网站更新，实际播放以可用音源为准。' : '选择歌单后加载歌曲。');
    const fragment = document.createDocumentFragment();
    const tracks = playlist.tracks || [];
    trackPage = Math.min(trackPage, Math.max(1, Math.ceil(tracks.length / trackSize)));
    const start = (trackPage - 1) * trackSize;
    tracks.slice(start, start + trackSize).forEach((track, offset) => {
      const index = start + offset;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'music-track'; const isCurrent = current === track;
      button.setAttribute('aria-current', String(isCurrent)); button.setAttribute('aria-label', '播放 ' + track.name + ' — ' + track.artist);
      const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
      const meta = document.createElement('span'), title = document.createElement('strong'), artist = document.createElement('small'); title.textContent = track.name; artist.textContent = track.artist; meta.append(title, artist);
      const action = document.createElement('span'); action.className = 'track-action'; action.textContent = isCurrent ? '●' : '↗';
      button.append(number, coverImage(track.cover), meta, action); button.onclick = () => activate(playlist, track); fragment.append(button);
    });
    $('#music-tracks').replaceChildren(fragment);
    pager('#track-pages', tracks.length, trackPage, trackSize, page => { trackPage = page; renderTracks(); });
  }
  function loadPlaylist(playlist) {
    if (playlist.local) return Promise.resolve(playlist.tracks);
    if (requests.has(playlist.id)) return requests.get(playlist.id);
    playlist.error = '';
    const script = document.createElement('script');
    let timer;
    const loading = new Promise((resolve, reject) => {
      script.onload = () => {
        const data = window.ASKER_PLAYLIST_DATA?.[playlist.id];
        if (Array.isArray(data)) resolve(data); else reject(new Error('歌曲文件无效。'));
      };
      script.onerror = () => reject(new Error('歌曲文件读取失败，请刷新页面重试。'));
      timer = setTimeout(() => reject(new Error('歌曲文件读取超时，请刷新页面重试。')), 15000);
      script.src = playlist.dataFile;
      document.head.append(script);
    }).then(data => {
      playlist.tracks = data.filter(item => item && safeURL(item.url)).map(item => ({ name: String(item.name || '未命名歌曲'), artist: String(item.artist || '未知歌手'), url: safeURL(item.url), cover: safeURL(item.cover) || background.cover }));
    }).catch(error => { playlist.error = error.message + ' 当前播放不受影响。'; })
      .finally(() => { clearTimeout(timer); script.remove(); requests.delete(playlist.id); renderShelf(); renderTracks(); });
    requests.set(playlist.id, loading);
    renderTracks(); return loading;
  }
  $('#playlist-play').onclick = () => { const playlist = library.get(viewed); if (playlist?.tracks?.length) activate(playlist); };
  $('#music-toggle').onclick = $('#music-page-play').onclick = toggle;
  $('#music-prev').onclick = () => step(-1); $('#music-next').onclick = () => step(1);
  $('#music-loop').onclick = () => { loop = loop === 'all' ? 'one' : 'all'; $('#music-loop').textContent = loop === 'one' ? '单曲' : '循环'; $('#music-loop').title = loop === 'one' ? '单曲循环' : '列表循环'; $('#music-loop').setAttribute('aria-label', (loop === 'one' ? '当前单曲循环' : '当前列表循环') + '，点击切换'); };
  audio.volume = 0.2; $('#music-volume').oninput = event => { audio.volume = Number(event.target.value); };
  $('#music-seek').oninput = event => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 1000 * audio.duration; };
  audio.addEventListener('loadedmetadata', () => { $('#music-duration').textContent = formatTime(audio.duration); $('#music-seek').disabled = !Number.isFinite(audio.duration); });
  audio.addEventListener('timeupdate', () => { $('#music-elapsed').textContent = formatTime(audio.currentTime); $('#music-seek').value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 1000 : 0; });
  audio.addEventListener('play', playbackUI); audio.addEventListener('pause', playbackUI);
  audio.addEventListener('ended', () => { if (loop === 'one') { audio.currentTime = 0; play(); } else step(1); });
  audio.addEventListener('error', () => notify('当前音源无法播放。可切换歌曲或到网易云收听。'));
  for (const selector of ['#dock-cover', '#music-art']) $(selector).onerror = event => { if (!event.target.src.endsWith('/assets/album.webp')) event.target.src = background.cover; };
  paintCurrent(); renderShelf(); renderTracks();
  const initial = library.get(viewed); if (!initial.local) loadPlaylist(initial);
})();

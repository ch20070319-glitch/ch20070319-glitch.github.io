(function (root) {
  function chapter(name) {
    const match = String(name || '').trim().match(/^((?:19|20)\d{2}|\d{2})\s*年?\s*chapter\s*(.*)$/i);
    if (!match) return null;
    const month = match[2].match(/^(1[0-2]|0?[1-9])(?=$|[^\d])/);
    if (!month && /^\d/.test(match[2])) return null;
    const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
    return { year, month: month ? Number(month[1]) : 0, key: String(year), label: String(year).slice(-2) + ' Chapter 合集' };
  }
  function group(playlist) { return playlist.local ? null : chapter(playlist.sourceName || playlist.name); }
  function sorted(playlists) {
    return [...playlists].sort((a, b) => {
      if (a.local || b.local) return Number(!!b.local) - Number(!!a.local);
      const left = group(a), right = group(b);
      if (left && right) return right.year - left.year || right.month - left.month || String(a.name).localeCompare(String(b.name), 'zh-CN');
      if (left || right) return left ? -1 : 1;
      return 0;
    });
  }
  const api = { chapter, group, sorted };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AskerPlaylistGroups = api;
})(typeof window !== 'undefined' ? window : globalThis);

"""Owner-only local tool: synchronize public NetEase playlists into static files."""
import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode, urlsplit, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
SONGS = {}


def parse_id(value):
    value = str(value).strip()
    if re.fullmatch(r'\d{1,20}', value):
        return value
    match = re.search(r'https?://[^\s，。]+', value)
    if not match:
        raise ValueError('请输入歌单 ID 或网易云完整歌单链接。')
    url = urlsplit(match[0])
    if url.hostname not in ('music.163.com', 'y.music.163.com'):
        raise ValueError('仅支持网易云歌单链接。')
    match = re.search(r'playlist(?:/|\?id=)(\d+)|playlist[^#]*?[?&]id=(\d+)', match[0])
    if not match:
        raise ValueError('链接中没有找到歌单 ID；短链接请先打开并复制完整链接。')
    return parse_id(match[1] or match[2])


def request(path, params):
    url = 'https://music.163.com' + path + '?' + urlencode(params)
    last = None
    for attempt in range(3):
        try:
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/'})
            with urlopen(req, timeout=18) as response:
                data = json.load(response)
            if data.get('code') != 200:
                raise ValueError('网易云暂未返回可用数据：' + str(data.get('code')))
            return data
        except Exception as error:
            last = error
            if attempt < 2:
                time.sleep(attempt + 1)
    raise last


def https_url(value):
    value = str(value or '')
    if value.startswith('http://'):
        value = 'https://' + value[7:]
    return value if value.startswith('https://') else ''


def read_config():
    data = json.loads((ROOT / 'playlists.json').read_text(encoding='utf-8-sig'))
    if not isinstance(data.get('playlists'), list):
        raise ValueError('playlists.json 中必须包含 playlists 数组。')
    unique = {}
    for item in data['playlists']:
        if not isinstance(item, dict):
            raise ValueError('每个歌单应为包含 id 的对象。')
        playlist_id = parse_id(item.get('id', ''))
        unique[playlist_id] = {'id': playlist_id, 'label': str(item.get('label', ''))}
    return list(unique.values())


def write_config(items):
    (ROOT / 'playlists.json').write_text(json.dumps({'playlists': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def atomic_write(path, text):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    temporary.replace(path)


def synchronize():
    items = read_config()
    directory = ROOT / 'music-data'
    directory.mkdir(exist_ok=True)
    timestamp = datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
    version = str(int(time.time()))
    playlists, failed = [], []
    for index, item in enumerate(items, 1):
        playlist_id = item['id']
        try:
            data = request('/api/v6/playlist/detail', {'id': playlist_id, 'n': 1000, 's': 0})
            playlist = data.get('playlist') or data.get('result') or {}
            if not playlist.get('name'):
                raise ValueError('未找到公开歌单。')
            ids = [row['id'] for row in playlist.get('trackIds', []) if isinstance(row.get('id'), int)]
            SONGS.update({song['id']: song for song in playlist.get('tracks', [])})
            missing = [song_id for song_id in ids if song_id not in SONGS]
            for start in range(0, len(missing), 200):
                songs = request('/api/v3/song/detail', {'c': json.dumps([{'id': song_id} for song_id in missing[start:start + 200]], separators=(',', ':'))}).get('songs', [])
                SONGS.update({song['id']: song for song in songs})
            tracks = []
            for song_id in ids or [song['id'] for song in playlist.get('tracks', [])]:
                song = SONGS.get(song_id)
                if not song:
                    continue
                album = song.get('al') or song.get('album') or {}
                tracks.append({'name': song.get('name', ''), 'artist': '/'.join(artist.get('name', '') for artist in song.get('ar') or song.get('artists') or []),
                               'url': f'https://music.163.com/song/media/outer/url?id={song_id}.mp3', 'cover': https_url(album.get('picUrl', ''))})
            payload = 'window.ASKER_PLAYLIST_DATA = window.ASKER_PLAYLIST_DATA || {};\nwindow.ASKER_PLAYLIST_DATA[' + json.dumps(playlist_id) + '] = ' + json.dumps(tracks, ensure_ascii=False, separators=(',', ':')) + ';\n'
            atomic_write(directory / (playlist_id + '.js'), payload)
            playlists.append({'id': playlist_id, 'name': playlist['name'], 'sourceName': playlist['name'], 'cover': https_url(playlist.get('coverImgUrl', '')),
                              'trackCount': len(tracks), 'unavailableCount': max(0, len(ids) - len(tracks)), 'dataFile': f'music-data/{playlist_id}.js?v={version}'})
            print(f'[{index}/{len(items)}] {playlist_id}: {len(tracks)} tracks', flush=True)
        except Exception as error:
            failed.append(playlist_id)
            print(f'[{index}/{len(items)}] FAILED {playlist_id}: {error}', flush=True)
    if failed:
        print('未覆盖原歌单索引。失败 ID：' + ', '.join(failed), flush=True)
        return 1
    config = {'mode': 'static', 'updatedAt': timestamp, 'playlists': playlists}
    atomic_write(ROOT / 'music-config.js', 'window.ASKER_MUSIC = ' + json.dumps(config, ensure_ascii=False, indent=2) + ';\n')
    atomic_write(ROOT / 'music-data/manifest.json', json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    page = ROOT / 'index.html'
    if page.exists():
        content = page.read_text(encoding='utf-8')
        content = re.sub(r'src="music-config\.js(?:\?[^"]*)?"', 'src="music-config.js?v=' + version + '"', content)
        atomic_write(page, content)
    print(f'DONE: {len(playlists)} playlists, {sum(p["trackCount"] for p in playlists)} tracks. Publish music-config.js and music-data/ together.', flush=True)
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--add', help='添加歌单 ID 或完整链接后同步')
    parser.add_argument('--remove', help='移除歌单 ID 后同步')
    parser.add_argument('--manage', action='store_true', help='本机交互式管理')
    args = parser.parse_args()
    items = read_config()
    if args.manage:
        print('1 Add playlist\n2 Remove playlist\n3 Sync all playlists')
        choice = input('Choose: ').strip()
        if choice == '1':
            args.add = input('Playlist ID or full URL: ')
        elif choice == '2':
            for item in items:
                print(item['id'], item.get('label', ''))
            args.remove = input('Playlist ID to remove: ')
        elif choice != '3':
            return 0
    if args.add:
        playlist_id = parse_id(args.add)
        if not any(item['id'] == playlist_id for item in items):
            items.append({'id': playlist_id, 'label': ''})
    if args.remove:
        playlist_id = parse_id(args.remove)
        items = [item for item in items if item['id'] != playlist_id]
    if args.add or args.remove:
        write_config(items)
    return synchronize()


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)

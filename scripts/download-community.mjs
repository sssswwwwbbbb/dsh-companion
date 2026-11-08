import fs from 'node:fs';
import path from 'node:path';

// 从 GitHub Releases 下载社区版安装包，不经过作者的服务端。
// 用法：node scripts/download-community.mjs [darwin-arm64|win32-x64]
const repo = 'sssswwwwbbbb/dsh-companion';
const platform = process.argv[2] || (process.platform === 'win32' ? 'win32-x64' : 'darwin-arm64');
const suffix = platform === 'win32-x64' ? 'win32-x64' : 'darwin-arm64';

const headers = { 'user-agent': 'dsh-companion-downloader' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const release = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers }).then(async r => {
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
});
const asset = (release.assets || []).find(item => item.name.endsWith(`community-${suffix}.tgz`));
if (!asset) throw new Error(`未找到 ${platform} 的社区版安装包，请到 ${release.html_url} 手动下载`);

const target = path.resolve(asset.name);
if (fs.existsSync(target)) {
  console.log(`已存在：${target}`);
  process.exit(0);
}
console.log(`下载 ${asset.name}（${(asset.size / 1048576).toFixed(1)} MB）`);
const response = await fetch(asset.browser_download_url, { headers: { 'user-agent': headers['user-agent'] } });
if (!response.ok) throw new Error(`下载失败 ${response.status}`);
const buffer = Buffer.from(await response.arrayBuffer());
if (buffer.byteLength !== asset.size) throw new Error('下载大小与 Release 记录不一致');
fs.writeFileSync(target, buffer);
console.log(`完成：${target}`);
console.log('在 DSH 插件管理里选择这个本地文件安装。社区版不含授权服务地址，需自行构建或本地使用。');

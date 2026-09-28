import { CommandError } from './commands.ts';

export function repositoryIdentity(remote: string): string {
  const invalid = () => new CommandError('invalid_input', 'Use an HTTPS or SSH Git remote without credentials, query or fragment');
  if ((/[\s\\%]/.test(remote) || [...remote].some((c) => c.charCodeAt(0) < 32)) || /%(?:2f|5c|2e|00)/i.test(remote)) throw invalid();
  const scp = /^git@([^/:]+):(.+)$/.exec(remote);
  let url: URL;
  try { url = new URL(scp ? `ssh://git@${scp[1]}/${scp[2]}` : remote); } catch { throw invalid(); }
  if (!['https:', 'ssh:'].includes(url.protocol) || url.password || url.search || url.hash || (url.username && !(url.protocol === 'ssh:' && url.username === 'git'))) throw invalid();
  const path = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '');
  if (!url.hostname || !path || path.split('/').some((part) => !part || part === '.' || part === '..') || /(?:^|\/)\.\.?\//.test(remote)) throw invalid();
  // GitHub's HTTPS and SSH aliases designate one case-insensitive repository.
  if (url.hostname === 'github.com' && !url.port) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(path)) throw invalid();
    return `github.com/${path.toLowerCase()}`;
  }
  return `${url.host}/${path}`;
}

export function validateGitRef(ref: string): void {
  if (!ref || ref.startsWith('-') || ref.startsWith('/') || ref.endsWith('/') || ref.endsWith('.') || ref.includes('..') || ref.includes('@{') || ref.includes('//') || ref === '@' || (/[\s~^:?*\\]/.test(ref) || ref.includes('[') || [...ref].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) || ref.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))) throw new CommandError('invalid_input', 'Invalid Git ref');
}

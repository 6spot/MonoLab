"""Explicitly invoked GitHub feasibility experiment; synthetic repositories only."""
import argparse
import base64
import datetime
import hashlib
import json
import pathlib
import re
import subprocess
import time


def parse_response(output):
    headers, separator, body = output.replace('\r\n', '\n').partition('\n\n')
    match = re.match(r'HTTP/\S+ (\d{3})', headers)
    if not match or not separator:
        raise RuntimeError('Missing structured HTTP response')
    return int(match.group(1)), json.loads(body) if body.strip() else None


class GitHub:
    def __init__(self, evidence):
        self.evidence = pathlib.Path(evidence)
        self.evidence.mkdir(parents=True, exist_ok=False, mode=0o700)
        self.sequence = 0

    def save(self, name, data):
        with (self.evidence / (name + '.json')).open('x') as output:
            json.dump(data, output, indent=2, sort_keys=True)
            output.write('\n')

    def request(self, method, endpoint, body=None):
        args = ['gh', 'api', '--include', '--method', method, endpoint,
                '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28']
        if body is not None:
            args += ['--input', '-']
        self.sequence += 1
        self.save(f'{self.sequence:03d}-intent', {'method': method, 'endpoint': endpoint, 'body': body})
        result = subprocess.run(args, input=json.dumps(body) if body is not None else None,
                                capture_output=True, text=True, timeout=40)
        status, value = parse_response(result.stdout)
        self.save(f'{self.sequence:03d}-response', {'status': status, 'body': value})
        return status, value

    def ok(self, method, endpoint, body=None):
        status, value = self.request(method, endpoint, body)
        if not 200 <= status < 300:
            raise RuntimeError(f'GitHub returned HTTP {status} for {method} {endpoint}')
        return value


def merge_body(expected_sha):
    if not re.fullmatch(r'[0-9a-f]{40}', expected_sha):
        raise ValueError('Expected immutable commit SHA required')
    return {'sha': expected_sha, 'merge_method': 'merge'}


def protect(api, repo, branch):
    return api.request('PUT', f'repos/{repo}/branches/{branch}/protection', {
        'required_status_checks': {'strict': False, 'contexts': ['monolab/probe']},
        'enforce_admins': True, 'required_pull_request_reviews': None, 'restrictions': None,
    })


def create_fixture(api, name, private):
    created = api.ok('POST', 'user/repos', {'name': name, 'private': private, 'auto_init': True,
                                         'description': 'Synthetic MonoLab provider feasibility fixture; no product source.'})
    repo = created['full_name']
    if not repo.split('/')[1].startswith('monolab-feasibility-'):
        raise RuntimeError('Unexpected fixture repository identity')
    api.save('repository-' + name, {'repo': repo, 'url': created['html_url'], 'private': private, 'id': created['id']})
    branch = created['default_branch']
    for _ in range(20):
        status, ref = api.request('GET', f'repos/{repo}/git/ref/heads/{branch}')
        if status == 200:
            return repo, branch, ref['object']['sha']
        if status != 409:
            raise RuntimeError(f'Unexpected initial ref status {status}')
        time.sleep(1)
    raise RuntimeError('Initial fixture commit unavailable')


def run(api, existing_repo=None):
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    name = 'monolab-feasibility-' + stamp
    if existing_repo:
        info = api.ok('GET', f'repos/{existing_repo}')
        if not info['name'].startswith('monolab-feasibility-') or info['description'] != 'Synthetic MonoLab provider feasibility fixture; no product source.':
            raise RuntimeError('Only the owned synthetic fixture is allowed')
        repo, base = info['full_name'], info['default_branch']
        sha = api.ok('GET', f'repos/{repo}/git/ref/heads/{base}')['object']['sha']
        status, _ = protect(api, repo, base)
        private_protection = None
    else:
        repo, base, sha = create_fixture(api, name, True)
        status, _ = protect(api, repo, base)
        private_protection = status
        if status in (403, 404):
            # A new synthetic-only public repository, never visibility-changing an existing one.
            repo, base, sha = create_fixture(api, name + '-public', False)
            status, _ = protect(api, repo, base)
    if status != 200:
        raise RuntimeError(f'Required branch protection unavailable: HTTP {status}')
    branch = 'probe-head-' + stamp
    filename = branch + '.txt'
    api.ok('POST', f'repos/{repo}/git/refs', {'ref': 'refs/heads/' + branch, 'sha': sha})
    first = api.ok('PUT', f'repos/{repo}/contents/{filename}', {
        'message': 'Synthetic head A', 'branch': branch, 'content': base64.b64encode(b'synthetic A\n').decode(),
    })
    accepted = first['commit']['sha']
    pr = api.ok('POST', f'repos/{repo}/pulls', {'title': 'Synthetic exact-head feasibility', 'head': branch, 'base': base,
                                             'body': 'Isolated provider test. Synthetic content only.'})
    number = pr['number']
    second = api.ok('PUT', f'repos/{repo}/contents/{filename}', {
        'message': 'Synthetic head B', 'branch': branch, 'sha': first['content']['sha'],
        'content': base64.b64encode(b'synthetic B\n').decode(),
    })
    current = second['commit']['sha']
    api.ok('POST', f'repos/{repo}/statuses/{current}', {'state': 'success', 'context': 'monolab/probe', 'description': 'Isolate expected-SHA guard'})
    for _ in range(20):
        ready = api.ok('GET', f'repos/{repo}/pulls/{number}')
        if ready['head']['sha'] == current and ready.get('mergeable') is True and ready.get('mergeable_state') == 'clean':
            break
        time.sleep(1)
    else:
        raise RuntimeError('Mergeability did not settle before expected-SHA test')
    stale, _ = api.request('PUT', f'repos/{repo}/pulls/{number}/merge', merge_body(accepted))
    checks = {'stale_head_rejected': stale == 409}
    pr_state = api.ok('GET', f'repos/{repo}/pulls/{number}')
    checks['stale_request_left_pr_open'] = pr_state['state'] == 'open' and not pr_state['merged'] and pr_state['head']['sha'] == current
    observed = {}
    for state in ('pending', 'failure', 'success'):
        api.ok('POST', f'repos/{repo}/statuses/{current}', {'state': state, 'context': 'monolab/probe', 'description': 'Synthetic ' + state})
        combined = api.ok('GET', f'repos/{repo}/commits/{current}/status')
        observed[state] = combined['state']
        checks[state + '_visible'] = combined['state'] == state
        result_status = None
        value = None
        for _ in range(12):
            time.sleep(1)
            result_status, value = api.request('PUT', f'repos/{repo}/pulls/{number}/merge', merge_body(current))
            if state != 'success' or result_status == 200:
                break
            if result_status not in (405,):
                break
        checks[state + '_merge_guard'] = (result_status in (405, 409) if state != 'success' else result_status == 200 and value.get('merged') is True)
        if state != 'success':
            current_pr = api.ok('GET', f'repos/{repo}/pulls/{number}')
            checks[state + '_still_open'] = not current_pr['merged']
            if current_pr['merged']:
                break
    final = api.ok('GET', f'repos/{repo}/pulls/{number}')
    checks['merged_exact_head'] = final['merged'] is True and final['head']['sha'] == current
    report = {'outcome': 'pass' if all(checks.values()) and len(observed) == 3 else 'fail', 'repo': repo, 'pr': number,
              'accepted_old_head': accepted, 'merged_head': current, 'private_protection_http': private_protection,
              'checks': checks, 'required_status_context': 'monolab/probe', 'source_sha256': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
    api.save('result', report)
    print(json.dumps(report, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--execute', action='store_true', help='Create synthetic repositories and run the authorized mutation experiment')
    parser.add_argument('--repo', help='Reuse a repository created by this synthetic probe')
    args = parser.parse_args()
    if not args.execute:
        parser.error('Explicit --execute is required for the repository experiment')
    api = GitHub(args.evidence)
    try:
        report = run(api, args.repo)
    except Exception as error:
        api.save('failure', {'category': type(error).__name__})
        raise
    raise SystemExit(0 if report['outcome'] == 'pass' else 2)


if __name__ == '__main__':
    main()

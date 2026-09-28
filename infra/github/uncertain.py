"""Recover synthetic provider effects without using their discarded replies."""
import argparse
import base64
import datetime
import hashlib
import json
import pathlib
import time
from urllib.parse import urlencode
from probe import GitHub, merge_body


class LostResponse(Exception):
    pass


def discard_response(api, method, endpoint, body):
    status, _ = api.request(method, endpoint, body)
    if not 200 <= status < 300:
        raise RuntimeError(f'Injection not reached: HTTP {status}')
    raise LostResponse('Successful response deliberately withheld from caller')


def matching_pr(pulls, repo, branch, base, marker):
    matches = [pr for pr in pulls if pr['head']['ref'] == branch and pr['base']['ref'] == base
               and (pr['head'].get('repo') or {}).get('full_name') == repo
               and (pr['base'].get('repo') or {}).get('full_name') == repo
               and pr.get('body') == marker]
    if len(matches) != 1:
        raise RuntimeError('Create outcome unresolved: expected one exact remote match')
    return matches[0]


def merged_result(pr, expected_head):
    return bool(pr.get('merged') is True and pr['head']['sha'] == expected_head and pr.get('merge_commit_sha'))


def run(api, repo):
    info = api.ok('GET', f'repos/{repo}')
    if not info['name'].startswith('monolab-feasibility-') or info['description'] != 'Synthetic MonoLab provider feasibility fixture; no product source.':
        raise RuntimeError('Unrecognized synthetic repository')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    branch = 'uncertain-' + stamp
    marker = 'MonoLab synthetic operation ' + stamp
    base = info['default_branch']
    base_sha = api.ok('GET', f'repos/{repo}/git/ref/heads/{base}')['object']['sha']
    api.save('operation', {'repository_id': info['id'], 'repo': repo, 'head_branch': branch, 'base': base, 'marker': marker})
    api.ok('POST', f'repos/{repo}/git/refs', {'ref': 'refs/heads/' + branch, 'sha': base_sha})
    commit = api.ok('PUT', f'repos/{repo}/contents/{branch}.txt', {'message': 'Synthetic uncertain-response test',
                    'branch': branch, 'content': base64.b64encode(b'Synthetic response-loss fixture.\n').decode()})
    expected_head = commit['commit']['sha']
    try:
        discard_response(api, 'POST', f'repos/{repo}/pulls', {'title': 'Synthetic uncertain response', 'head': branch, 'base': base, 'body': marker})
    except LostResponse:
        api.save('create-response-lost', {'injected': True, 'next_action': 'lookup; no second create'})
    # No PR ID or response is used from the mutation call.
    query = urlencode({'state': 'all', 'head': repo.split('/')[0] + ':' + branch, 'base': base, 'per_page': 100})
    pulls = api.ok('GET', f'repos/{repo}/pulls?{query}')
    if len(pulls) >= 100:
        raise RuntimeError('Ambiguous/truncated lookup; no repeated create')
    recovered = matching_pr(pulls, repo, branch, base, marker)
    number = recovered['number']
    if recovered['head']['sha'] != expected_head:
        raise RuntimeError('Recovered PR head differs from accepted head')
    api.save('create-recovered', {'number': number, 'head': expected_head, 'source': 'remote lookup'})
    api.ok('POST', f'repos/{repo}/statuses/{expected_head}', {'state': 'success', 'context': 'monolab/probe', 'description': 'Synthetic recovery check'})
    for _ in range(30):
        pr = api.ok('GET', f'repos/{repo}/pulls/{number}')
        if pr['head']['sha'] != expected_head:
            raise RuntimeError('Head changed before merge')
        if pr.get('mergeable') is True and pr.get('mergeable_state') == 'clean':
            break
        time.sleep(1)
    else:
        raise RuntimeError('Mergeability unavailable; no merge issued')
    api.save('merge-intent', {'number': number, 'accepted_head': expected_head})
    try:
        discard_response(api, 'PUT', f'repos/{repo}/pulls/{number}/merge', merge_body(expected_head))
    except LostResponse:
        api.save('merge-response-lost', {'injected': True, 'next_action': 'lookup; no second merge'})
    for _ in range(20):
        remote = api.ok('GET', f'repos/{repo}/pulls/{number}')
        if merged_result(remote, expected_head):
            break
        time.sleep(1)
    else:
        raise RuntimeError('Merge outcome unresolved; no repeated merge')
    intents = [json.loads(path.read_text()) for path in api.evidence.glob('[0-9]*-intent.json')]
    creates = sum(row['method'] == 'POST' and row['endpoint'] == f'repos/{repo}/pulls' for row in intents)
    merges = sum(row['method'] == 'PUT' and row['endpoint'] == f'repos/{repo}/pulls/{number}/merge' for row in intents)
    report = {'outcome': 'pass' if creates == merges == 1 else 'fail', 'repo': repo, 'pr': number,
              'head': expected_head, 'merge_commit': remote['merge_commit_sha'], 'create_requests': creates,
              'merge_requests': merges, 'create_recovered_by_lookup': True, 'merge_recovered_by_lookup': True,
              'fault_boundary': 'successful API return discarded before application consumes it; not TCP packet loss',
              'source_sha256': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
    api.save('result', report); print(json.dumps(report, indent=2)); return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    if not args.execute:
        parser.error('Explicit --execute required')
    api = GitHub(args.evidence)
    try:
        report = run(api, args.repo)
    except Exception as error:
        api.save('failure', {'category': type(error).__name__}); raise
    raise SystemExit(0 if report['outcome'] == 'pass' else 2)


if __name__ == '__main__':
    main()

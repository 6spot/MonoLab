import unittest
from probe import merge_body, parse_response
from uncertain import matching_pr, merged_result


class GitHubProbeTests(unittest.TestCase):
    def test_http_error_is_retained_as_status(self):
        self.assertEqual(parse_response('HTTP/2.0 409 Conflict\r\nX-Test: value\r\n\r\n{"message":"changed"}'), (409, {'message': 'changed'}))

    def test_empty_response_and_missing_headers(self):
        self.assertEqual(parse_response('HTTP/2.0 204 No Content\n\n'), (204, None))
        with self.assertRaises(RuntimeError):
            parse_response('{"merged":true}')

    def test_merge_cannot_omit_or_use_mutable_expected_head(self):
        self.assertEqual(merge_body('a' * 40), {'sha': 'a' * 40, 'merge_method': 'merge'})
        for value in ('', 'main', 'a' * 39):
            with self.assertRaises(ValueError):
                merge_body(value)

    def test_lookup_refuses_missing_ambiguous_or_foreign_pr(self):
        pr = {'head': {'ref': 'probe', 'repo': {'full_name': 'owner/repo'}},
              'base': {'ref': 'main', 'repo': {'full_name': 'owner/repo'}}, 'body': 'marker'}
        self.assertEqual(matching_pr([pr], 'owner/repo', 'probe', 'main', 'marker'), pr)
        for pulls in ([], [pr, pr], [{**pr, 'body': 'another operation'}]):
            with self.assertRaises(RuntimeError):
                matching_pr(pulls, 'owner/repo', 'probe', 'main', 'marker')

    def test_merge_recovery_requires_remote_exact_head_and_commit(self):
        good = {'merged': True, 'head': {'sha': 'a' * 40}, 'merge_commit_sha': 'b' * 40}
        self.assertTrue(merged_result(good, 'a' * 40))
        self.assertFalse(merged_result(good, 'c' * 40))
        self.assertFalse(merged_result({**good, 'merged': False}, 'a' * 40))
        self.assertFalse(merged_result({**good, 'merge_commit_sha': None}, 'a' * 40))


if __name__ == '__main__':
    unittest.main()

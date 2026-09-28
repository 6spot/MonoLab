# Single-Owner access

Run migrations and configure the Owner from a trusted local management shell with
`DATABASE_URL` or `MONOLAB_DATABASE_URL_FILE` already configured. There is no public
signup or unauthenticated setup route.

The bootstrap command accepts one JSON object on stdin. Prompt without echoing the
password or putting it in command-line arguments:

```sh
python3 - <<'PY'
import getpass, json, subprocess
password = getpass.getpass('Owner password (at least 12 characters): ')
subprocess.run(['pnpm', 'owner:bootstrap'], input=json.dumps({'password': password}), text=True, check=True)
PY
```

To rotate an existing credential, add `--rotate` to that subprocess argument list.
Rotation revokes every old Owner session. The command prints only completion status;
the database stores a random salt and fixed-parameter scrypt hash, not the password.

Browser API sequence:

1. Same-origin `POST /v1/owner/login` with `{schema_version:1,password}`.
2. The server sets the Secure, HttpOnly, SameSite=Strict `__Host-monolab` cookie.
3. `GET /v1/owner/session` revalidates expiry/revocation. Existing Owner APIs accept
   this cookie; cookie-authenticated writes require matching Origin.
4. `POST /v1/owner/logout` revokes the session and expires the cookie.

Serve browser traffic over HTTPS. The application does not trust forwarded origin
headers by default. Keep the public Host/protocol consistent through ingress and
do not enable cross-origin access. Explicit Bearer authentication remains available
for existing trusted API clients; Runner and Attempt credentials are never accepted.

Five failed password attempts in a minute throttle further login with HTTP 429 and
Retry-After. This is persisted across backend restarts. Login/session responses are
no-store. Passwords are bounded to at least 12 characters and at most 1024 UTF-8 bytes.

This backend leaf does not yet add the configuration UI or automatically configure
the deployed host's Owner credentials.

# Hosting BiletFlow on Oracle Cloud (free)

One small server runs everything: PostgreSQL, the Go API, the website and
[Caddy](https://caddyserver.com), which serves it all over HTTPS on one address
and gets the certificate by itself. Nothing sleeps, so there is no cron job to
keep it awake; `https://<your address>/health` is there if you want a monitor.

The address is a free [sslip.io](https://sslip.io) name built from the
server's IP (`141.147.1.2` becomes `141-147-1-2.sslip.io`), so no domain has to
be bought.

## 1. Create the account

Sign up at <https://www.oracle.com/cloud/free/>. Oracle asks for a bank card to
confirm identity; the **Always Free** resources below do not charge it. Pick a
home region close to Kazakhstan (for example Frankfurt) - it cannot be changed
later.

## 2. Create the server

In the console: **Compute → Instances → Create instance**.

- **Image:** Canonical **Ubuntu 24.04**.
- **Shape:** *Ampere* → **VM.Standard.A1.Flex**, 2 OCPUs and 12 GB memory
  (inside the Always Free limit). If Oracle answers "out of capacity", try
  another availability domain or try again later.
- **SSH keys:** "Paste public keys", with the key made in WSL:

  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/biletflow -N ""
  cat ~/.ssh/biletflow.pub
  ```

Create it and copy its **Public IP address**.

## 3. Open ports 80 and 443 in the cloud firewall

**Networking → Virtual cloud networks →** the instance's network **→ Security
Lists → Default security list → Add ingress rules**, twice:

| Source CIDR | IP protocol | Destination port |
| --- | --- | --- |
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(The server's own firewall is opened by the setup script.)

## 4. Install BiletFlow

From WSL, connect (use your IP):

```bash
ssh -i ~/.ssh/biletflow ubuntu@141.147.1.2
```

On the server:

```bash
git clone https://github.com/ansarzeinulla/ticket-project.git
cd ticket-project
git checkout week-11          # or main, once it is merged
bash deploy/oracle/setup.sh
```

The first run installs Docker, opens the server firewall, writes `.env` with
fresh secrets and the sslip.io address, builds everything (several minutes),
loads the demo data and finally prints the address:

```
BiletFlow is up:
  website:  https://141-147-1-2.sslip.io
  API:      https://141-147-1-2.sslip.io/api/v1
```

## 5. Real email (optional)

Add the Gmail lines to `.env` on the server (quotes as shown), then run the
script again:

```bash
nano .env
```

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.address@gmail.com
SMTP_PASSWORD="abcdefghijklmnop"
MAIL_FROM="BiletFlow <your.address@gmail.com>"
```

```bash
bash deploy/oracle/setup.sh
```

Oracle blocks outgoing port 25 only; Gmail's 587 works.

## 6. The phone app against the server

On your laptop, no tunnels needed any more:

```bash
cd /mnt/c/csci361_labs/ticket-project/mobile
export EXPO_PUBLIC_API_BASE_URL=https://141-147-1-2.sslip.io/api/v1
npx expo start --tunnel
```

Scan the QR code with Expo Go (SDK 57).

## Updating

After new commits are merged:

```bash
ssh -i ~/.ssh/biletflow ubuntu@141.147.1.2
cd ticket-project
git pull
bash deploy/oracle/setup.sh
```

It rebuilds, applies schema changes and keeps all data. To start the demo data
from scratch instead:

```bash
sudo docker compose -f docker-compose.yml -f deploy/oracle/compose.yml --profile app down -v
bash deploy/oracle/setup.sh
```

## Good to know

- **The demo accounts are public.** Every seeded account, including the admin
  `support@biletflow.kz`, uses the password `biletflow-demo`, as the main
  README says. That is what makes the demo easy to show; it also means anyone
  who finds the address can sign in as them. Fine for a course demo; change the
  passwords from the profile page if that matters.
- **Logs:** `sudo docker compose -f docker-compose.yml -f deploy/oracle/compose.yml --profile app logs -f api`
  (or `web`, `caddy`, `db`).
- **Uploaded event images** live in a Docker volume and survive restarts and
  updates; `down -v` deletes them with the database.

# Hosting BiletFlow on Dokploy

One Dokploy **Compose** service runs everything: PostgreSQL, the Go API and the
website. Dokploy's Traefik serves it over HTTPS on your domain; the routing is in
`deploy/dokploy/docker-compose.yml` as labels, so no domains are added by hand.
The demo data loads by itself on the first deploy.

## Before you start

- Your domain (or a subdomain, e.g. `biletflow.yourdomain.kz`) has an **A record**
  pointing at the VPS's IP.
- The VPS has about **2 GB of free memory** for building the website. With less,
  add swap once on the VPS: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.

## Steps in Dokploy

1. **Create a project**, then inside it **Create Service → Compose**.
2. **Provider: Git** (the repository is public, so no account connection is needed):
   - Repository URL: `https://github.com/ansarzeinulla/ticket-project.git`
   - Branch: `week-11` (or `main` once merged)
   - **Compose Path:** `./deploy/dokploy/docker-compose.yml`
   - Save.
3. **Environment** tab, paste and fill in, then Save:

   ```
   DOMAIN=biletflow.yourdomain.kz
   POSTGRES_PASSWORD=pick-a-long-random-password
   JWT_SECRET=pick-a-random-string-of-at-least-32-characters
   ```

   For real email add the Gmail lines (quotes as shown):

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your.address@gmail.com
   SMTP_PASSWORD="abcdefghijklmnop"
   MAIL_FROM="BiletFlow <your.address@gmail.com>"
   ```

4. **Deploy.** The first build takes several minutes. When it finishes, open
   `https://<your domain>`; `https://<your domain>/health` answers `{"status":"ok",...}`.

Do not add rows in the **Domains** tab: the labels in the compose file already
route `/api/v1`, `/media`, `/uploads` and `/health` to the API and everything
else to the website, with the HTTPS certificate from Dokploy's Let's Encrypt.

## Updating

Press **Deploy** again after new commits are merged (or turn on auto-deploy if
the service is connected to your own fork). Schema changes are applied and the
data is kept.

## The phone app against the server

```bash
cd /mnt/c/csci361_labs/ticket-project/mobile
export EXPO_PUBLIC_API_BASE_URL=https://biletflow.yourdomain.kz/api/v1
npx expo start --tunnel
```

## Good to know

- The demo accounts are public: every seeded account, including the admin
  `support@biletflow.kz`, uses the password `biletflow-demo`.
- To start the demo data from scratch, delete the service's volumes in Dokploy
  (or stop it with its volumes removed) and deploy again.
- Logs: the service's **Logs** tab, per container (`api`, `web`, `db`, `seed`).

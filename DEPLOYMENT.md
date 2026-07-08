# CodeVault Deployment Plan

## Target Architecture

- Frontend: Vercel static Vite deployment from `frontend/`.
- Backend: one AWS Lightsail/EC2 Ubuntu instance running Node.js behind Nginx.
- Database: Oracle Free/XE on the same instance for the first 3-4 months.
- Budget target: use the `$24/month` size first for enough RAM, then downsize only after the app is stable.

## Recommended $100 Credit Plan

- Start with the `$24/month` instance class for one box running both API and Oracle Free/XE.
- Expected credit life: about 4 months before tax, static IP, snapshots, domain, or accidental extras.
- If RAM usage is comfortable after testing, try the `$12/month` size.
- Do not use RDS Oracle, NAT Gateway, load balancer, multi-AZ, or managed cache under this budget.

## Backend On AWS Ubuntu

1. Create a Lightsail or EC2 Ubuntu instance.
2. Open inbound ports:
   - `22` from your IP only
   - `80` from anywhere
   - `443` from anywhere
   - Do not expose Oracle port `1521` publicly
3. SSH into the instance.
4. Run the setup script:
   ```bash
   chmod +x deploy/aws/setup-ubuntu.sh
   sudo deploy/aws/setup-ubuntu.sh
   ```
5. Copy backend env:
   ```bash
   cp backend/.env.example backend/.env
   nano backend/.env
   ```
6. Install and start the API:
   ```bash
   chmod +x deploy/aws/deploy-backend.sh
   deploy/aws/deploy-backend.sh
   ```
7. Configure Nginx:
   ```bash
   sudo cp deploy/aws/nginx-codevault.conf /etc/nginx/sites-available/codevault
   sudo ln -sf /etc/nginx/sites-available/codevault /etc/nginx/sites-enabled/codevault
   sudo nginx -t
   sudo systemctl reload nginx
   ```
8. Verify:
   ```bash
   curl http://YOUR_SERVER_IP/api/health
   pm2 status
   ```

## Oracle On Same Instance

For the `$24/month` plan, run Oracle Free/XE on the same box. Keep it private to localhost.

Set:

```env
ORACLE_CONNECTION_STRING=localhost:1521/FREEPDB1
```

If you use Docker for Oracle, keep the volume persistent and avoid deleting it:

```bash
cd deploy/aws
docker compose -f oracle-free.compose.yml up -d
```

If Oracle does not fit in memory on the `$12/month` plan, move back to `$24/month`.

## Frontend On Vercel

1. Import the GitHub repo in Vercel.
2. Set Root Directory to `frontend`.
3. Use build command `npm run build` and output directory `dist`.
4. Set `VITE_API_BASE_URL` to the AWS backend URL ending in `/api`.
5. Deploy and test login/register/explore flows.

## Required Environment Variables

Backend:

```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-vercel-app.vercel.app
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
ORACLE_USER=codevault
ORACLE_PASSWORD=replace-with-your-db-password
ORACLE_CONNECTION_STRING=localhost:1521/FREEPDB1
```

Frontend:

```env
VITE_API_BASE_URL=https://your-api-domain-or-ip/api
```

## Cost Controls

- Create AWS Budgets alerts at `$20`, `$50`, and `$80`.
- Disable automatic snapshots unless you explicitly need them.
- Use one static IP only if needed.
- Keep CloudWatch/log retention short.
- Stop test instances when you are not using them.
- Check billing every 2-3 days during the first week.

## Things That Still Need Manual Work

- Creating the AWS account resources, because this needs your AWS login and billing confirmation.
- Creating or pointing a domain name, if you want HTTPS with a custom domain.
- Creating the Vercel project, because it needs your Vercel/GitHub authorization.
- Choosing and setting real secrets in `.env`.
- Installing/initializing Oracle Free/XE and creating the `codevault` database user.
- Running real end-to-end app flows after the public URLs exist.

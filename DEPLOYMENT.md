# CodeVault Deployment Plan

## Target Architecture

- Frontend: Vercel static Vite deployment from `frontend/`.
- Backend: AWS Elastic Beanstalk single-instance Node.js environment from `backend/`.
- Database: Oracle Database reachable from the backend only.
- Lowest-cost path: use free tiers where available, keep one small backend instance, and avoid always-on extras like NAT Gateway, load balancers, and managed caches until traffic requires them.

## Backend On AWS

1. Create an Oracle database endpoint. For the lowest operational cost, use an existing Oracle host or a small self-managed Oracle XE instance on the same EC2/VPC as the backend. For managed Oracle, Amazon RDS for Oracle is simpler but usually not the cheapest.
2. Create an Elastic Beanstalk Node.js app using the `backend/` folder.
3. Set environment variables from `backend/.env.example`.
4. Configure the backend security group to allow inbound HTTP/HTTPS only. Keep Oracle reachable only from the backend security group.
5. Deploy with `npm ci --omit=dev` and `npm start`.
6. Verify `https://your-api-domain/api/health` returns JSON.

## Frontend On Vercel

1. Import the GitHub repo in Vercel.
2. Set Root Directory to `frontend`.
3. Use build command `npm run build` and output directory `dist`.
4. Set `VITE_API_BASE_URL` to the AWS backend URL ending in `/api`.
5. Deploy and test login/register/explore flows.

## Cost Controls

- Prefer Elastic Beanstalk single instance without a load balancer for the first deployment.
- Stop or downsize non-production environments when not in use.
- Avoid NAT Gateway; place the backend in a public subnet with strict security-group rules for the minimal setup.
- Add CloudWatch log retention, for example 7 days, instead of indefinite retention.
- Move to RDS/ALB/multi-AZ only when uptime requirements justify the added monthly cost.

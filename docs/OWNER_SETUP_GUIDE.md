# Owner Go-Live Setup Guide (Non-Developer)

**Eliza Infotech CCTV CRM & ERP System**  
*Audience:* Business Owner (Aditya Sharma / Executive Management)  
*Estimated Setup Time:* 30–45 minutes  
*Prerequisites:* A web browser and account logins for Google, Supabase, and Cloudflare (all 100% free-tier).

---

> [!IMPORTANT]
> **THE "NEVER DO THIS" SECURITY RULES**
> 1. **NEVER paste secret keys or passwords** into WhatsApp, AI chat boxes, emails, or public screenshots.
> 2. **NEVER commit secrets** into GitHub or anywhere in the code.
> 3. **NEVER share Super Admin credentials** with unauthorized staff or outside vendors.
> 4. **NEVER turn off Row-Level Security (RLS)** in Supabase to "fix" an error. Doing so exposes your entire company's client list and ledger to anyone on the internet!

---

## STEP 1: Set Up Your Supabase Cloud Database (Mumbai Region)

Supabase is your secure cloud database and user storage. Its **Free Plan** includes 2 projects, 500 MB database storage, 1 GB file storage, and up to 50,000 monthly active users at ₹0 cost.

1. Go to **[supabase.com](https://supabase.com)** and click **Sign In** (you can sign in with your GitHub or Google account).
2. Click **New Project** and select your organization.
3. Fill in the project details:
   - **Name:** `eliza-cctv-prod`
   - **Database Password:** Click *Generate a password*, copy it, and save it in a password manager (like Bitwarden or 1Password).
   - **Region:** Select **`ap-south-1 (Mumbai)`** (this gives your team the fastest speeds in Panipat, Sonipat & Delhi NCR).
   - **Plan:** Free tier (₹0/mo).
4. Click **Create new project** and wait ~2 minutes for it to initialize.

### Finding Your Project Reference ID and API Keys
> [!NOTE]
> **Supabase Modern Free Plan Update:** Modern Supabase dashboards no longer surface a raw "Project URL" field; instead, Supabase provides your **Project Reference ID** and a **Publishable API Key**. Legacy JWT keys are still fully supported and available under the Legacy tab.

5. **Get Your Project Reference ID:**
   - Look at your browser address bar when inside your project dashboard: `https://supabase.com/dashboard/project/<PROJECT_REF>`.
   - The 20-character code (e.g. `abcdefghijklmnopqrst`) is your **Project Reference ID**.
   - Your API URL is automatically: `https://<PROJECT_REF>.supabase.co`.
   - *(You can also find this under **Project Settings (Gear Icon) > General > Reference ID**).*
6. **Get Your API Key:**
   - Go to **Project Settings (Gear Icon)** -> **API Keys** (or **Data API**).
   - Under **API Keys**, locate the **Publishable API Key** (starts with `sb_publishable_...`). Copy this key.
   - *Legacy Keys:* If you prefer or already have legacy JWT keys (`anon` / `public` starting with `eyJhbG...`), click the **Legacy API Keys** tab. Both the modern Publishable Key and Legacy Anon Key are fully supported by Eliza ERP.
7. **One-Click Connect in Eliza ERP:**
   - Open your Eliza ERP application, navigate to **ADMINISTRATION > Developer Tools > Setup Wizard** (or **Integrations Hub > Supabase**).
   - You can paste **either** your 20-character Project Reference ID (e.g. `abcdefghijklmnopqrst`) **or** your full URL (`https://abcdefghijklmnopqrst.supabase.co`)—our system automatically formats and normalizes it.
   - Paste your **Publishable API Key** (or Legacy `anon` key) and click **Save & Test Connection**.
8. **Run Database Migrations (One-Click / One-Line):**
   Open your terminal in the project folder and run:
   ```bash
   npx supabase db push
   ```
   *That’s it! All 13 business tables, RLS security policies, and indexes are automatically set up.*

---

## STEP 2: Configure Google Sign-In (Single Sign-On)

This lets your managers and supervisors log in securely with their Google accounts (`aditya@elizainfotech.com`). Google Cloud OAuth 2.0 Web Client authentication is **100% Free** with unlimited sign-in requests.

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Click the project dropdown at the top and click **New Project**:
   - Project Name: `Eliza ERP Login`
   - Click **Create**.
3. In the left menu, go to **APIs & Services** -> **OAuth consent screen**:
   - Choose **External** and click **Create**.
   - App Name: `Eliza Infotech ERP`
   - User support email: `aditya@elizainfotech.com`
   - Developer contact email: `aditya@elizainfotech.com`
   - Click **Save and Continue** through the remaining screens.
4. In the left menu, click **Credentials** -> **+ CREATE CREDENTIALS** -> **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Eliza ERP Web Client`
   - **Authorized JavaScript origins:** Paste your production site URL (e.g. `https://cctv.elizainfotech.com` or `https://eliza-cctv-erp.pages.dev`).
   - **Authorized redirect URIs:** Open your ERP -> **Developer Tools** -> **Domain & CORS Helper** -> click **Copy Redirect URI** (format: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`), and paste it into Google.
   - Click **Create**.
5. A popup will show your **Client ID** and **Client Secret**:
   - Copy the **Client ID** and paste it into **Developer Tools > Integrations Hub > Google SSO Card**.
   - Copy the **Client Secret** and paste it into the secret field. *(Our system encrypts it immediately—it will be masked as `••••last4` and cannot be read by anyone).*
6. In your **Supabase Dashboard**, go to **Authentication** -> **Providers** -> **Google**:
   - Toggle **Enable Google provider**.
   - Paste the same Client ID and Client Secret, then click **Save**.

---

## STEP 3: Deploy to Cloudflare Pages (Free Fast Global Hosting)

Cloudflare Pages provides **unlimited bandwidth, 100% free SSL certificates, DDoS mitigation, and edge caching** across 300+ global cities (including Delhi and Mumbai edge points).

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** and sign in.
2. In the left sidebar, click **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository (`CCTV Excel CRM` or `eliza-cctv-erp`).
4. Set up the build settings:
   - **Framework preset:** `None`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Environment variables (advanced)** and add your public settings:
   - Variable name: `VITE_SUPABASE_URL` -> Value: `https://<PROJECT_REF>.supabase.co` (or set `VITE_SUPABASE_PROJECT_REF`)
   - Variable name: `VITE_SUPABASE_PUBLISHABLE_KEY` -> Value: *Your Supabase Publishable Key* (or `VITE_SUPABASE_ANON_KEY`)
   - Variable name: `VITE_APP_ENV` -> Value: `production`
6. Click **Save and Deploy**. In ~60 seconds, your application is live on the internet!
7. **Custom Domain (e.g. `cctv.elizainfotech.com`):**
   - Click your Pages project -> **Custom domains** -> **Set up a custom domain**.
   - Type your domain and follow Cloudflare’s 1-click DNS connection.
   - Cloudflare will automatically issue a 100% free SSL certificate with HTTPS enabled.

---

## STEP 4: First Login, 2FA & 100% Security Check

1. Visit your new live website URL in your mobile phone or desktop browser.
2. Click **Continue with Google** and sign in with `aditya@elizainfotech.com`.
3. You will immediately be recognized as **Super Admin**.
4. In the left navigation, open **ADMINISTRATION > Developer Tools**.
5. Switch to the **Security Center** tab.
6. Review the automated security checklist:
   - ✅ Database Row-Level Security: Active
   - ✅ HTTPS Enforced & Strict CSP: Pass
   - ✅ Client-Side Secrets Masking: Pass
   - ✅ 30-Minute Idle Session Timeout: Active
   - ✅ Brute-Force Rate Limiting (5-Attempt Lockout): Active
7. Ensure your overall Security Posture Score reads **100/100 (EXCELLENT)**.

---

## STEP 5: Developer Tools & Free Tier Integration Guides

All optional tools in **Developer Tools > Integrations Hub** are pre-configured to operate on generous, zero-cost developer and free tiers:

### 1. Firebase Cloud Messaging (FCM v1 Web Push)
- **Plan:** **Firebase Spark Plan (100% Free Forever)** — unlimited push notifications to mobile and desktop devices.
- **Modern Update:** Google officially deprecated legacy Server Keys (`AAAA...`) in June 2024. Use modern **FCM v1** with Web Push Certificates (VAPID):
  1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project `eliza-cctv-enterprise`.
  2. Click **Project Settings (Gear)** -> **Cloud Messaging** tab.
  3. Under **Web configuration**, click **Generate key pair**. This gives you your **Web Push VAPID Key**.
  4. Paste your `projectId`, `messagingSenderId`, `appId`, and `vapidKey` into **Developer Tools > FCM Card**.

### 2. Transactional Email (Resend or Brevo)
- **Plan:** 
  - **Resend Free Tier:** **3,000 emails/month free** (100 emails/day), no credit card needed. Instant setup.
  - **Brevo Free Tier:** **300 emails/day free** (9,000 emails/month).
- **How to Connect:**
  1. Sign up at [resend.com](https://resend.com) -> click **API Keys** -> **Create API Key**.
  2. In Developer Tools -> **Transactional Email Card**, paste your API Key (`re_...`) and sender address (`billing@elizainfotech.com`).
  3. Used for automatic GST invoice delivery, quotation dispatch, and password resets.

### 3. WhatsApp Business Cloud API (Meta Official)
- **Plan:** **Meta Cloud API Free Tier** — **1,000 free service/customer care conversations every calendar month**.
- **How to Connect:**
  1. Go to [developers.facebook.com](https://developers.facebook.com) -> **My Apps** -> **Create App** (Business type).
  2. Add the **WhatsApp** product.
  3. In **API Setup**, copy your **Phone Number ID** and generate a **Permanent System User Access Token**.
  4. Paste into Developer Tools -> **WhatsApp Card**.
  5. Used for instant dispatch of job completion summaries, technician arrival alerts, and client quotes directly on WhatsApp.

### 4. Oracle Cloud Always Free (Automated Off-Site Disaster Recovery)
- **Plan:** **Oracle Cloud Always Free Tier** — Includes **20 GB free Object Storage** in Mumbai (`ap-mumbai-1`) + 2 AMD Compute VMs forever at ₹0.
- **How to Connect:**
  1. Sign up at [oracle.com/cloud/free/](https://oracle.com/cloud/free/) with home region **India South (Mumbai)**.
  2. Go to **Storage > Buckets** -> Create Bucket named `eliza-erp-backups`.
  3. Under your user profile -> **Customer Secret Keys** -> Generate Secret Key (gives S3-compatible Access Key & Secret Key).
  4. In Developer Tools -> **Backup & DR Card**, enter your bucket name, namespace, and credentials for automated nightly encrypted backups.

### 5. Cloudflare Pages & Edge Security
- **Plan:** **Cloudflare Free Tier** — Unlimited bandwidth, global CDN, automated SSL/TLS certificates, DDoS protection, and Web Application Firewall (WAF) at ₹0.

---

## STEP 6: Monthly Routine & Emergency Rollback

### What To Do Once A Month (1st Sunday):
1. **Review Security Logs:** Open **Developer Tools > Security Logs**. Verify that there are no suspicious login spikes.
2. **Download an Encrypted Backup:** In **Developer Tools > Backup & DR**, click **Export Encrypted Backup** and store it on an external hard drive or secure Google Drive.
3. **Verify Staff Roles:** Open **User Management** and ensure any staff who have left the company have their status set to **Suspended** (this blocks their login within 60 seconds).

### If Something Ever Breaks (Emergency 1-Click Rollback):
You do not need to edit code to fix a bad update:
1. Log into your **Cloudflare Dashboard** -> **Workers & Pages** -> click `eliza-cctv-erp`.
2. Click the **Deployments** tab.
3. Find yesterday's working build, click the three dots `...`, and select **Rollback to this deployment**.
4. Your site will instantly revert back to the previous version in under 30 seconds!

---

## 📞 Technical Support Contact
- **Engineering Lead / Antigravity Agent:** Available inside your repository workspace.
- **Super Administrator:** Aditya Sharma (`aditya@elizainfotech.com`)
- **System Documentation:** [`docs/RUNBOOK.md`](RUNBOOK.md) · [`docs/SECURITY.md`](SECURITY.md)

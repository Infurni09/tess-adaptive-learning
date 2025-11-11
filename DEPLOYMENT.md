# TESS Deployment Guide

## How to Seed Your Production Database

Your production database needs to be populated with questions after deployment. Follow these steps:

### Step 1: Deploy Your App

Click the **"Publish"** button in Replit to deploy your application.

### Step 2: Add Admin Secret

In your Replit deployment settings, add this environment variable:

```
ADMIN_SEED_SECRET=your-secret-key-here
```

Choose any random secret (e.g., `mysecret123`). You'll use this in the next step.

### Step 3: Log In to Your Deployed App

Visit your deployed app URL and sign in using Google, GitHub, or email authentication.

### Step 4: Seed the Database

Use this curl command to import all 2,485 DECA questions:

```bash
curl -X POST https://YOUR-APP-URL.replit.app/api/admin/seed-database \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "X-Admin-Secret: your-secret-key-here"
```

**How to get your session cookie:**
1. Open Developer Tools in your browser (F12)
2. Go to Application > Cookies
3. Copy the value of `connect.sid`

**Example:**
```bash
curl -X POST https://tess.johndoe.replit.app/api/admin/seed-database \
  -H "Cookie: connect.sid=s%3A1234567890abcdef.xyz..." \
  -H "X-Admin-Secret: mysecret123"
```

### Step 5: Verify It Worked

You should see a success response like:

```json
{
  "success": true,
  "totalImported": 2485,
  "results": [
    { "subject": "Finance", "status": "Success", "imported": 942 },
    { "subject": "Marketing", "status": "Success", "imported": 1271 },
    ...
  ],
  "message": "Successfully imported 2485 DECA questions into production database"
}
```

Now visit your deployed app and navigate to Practice > DECA. You should see all subjects populated!

### Security Notes

- The endpoint requires authentication (must be logged in)
- The endpoint requires the admin secret header
- The endpoint can only run ONCE (when database is empty)
- After seeding, the endpoint will return an error if called again
- You can optionally remove `ADMIN_SEED_SECRET` from env vars after seeding

### Troubleshooting

**"Database already contains questions"**
→ Seeding was already successful. Your app is ready to use!

**"Forbidden: Admin authorization required"**
→ Check that ADMIN_SEED_SECRET is set correctly and X-Admin-Secret header matches

**"Unauthorized"**
→ Make sure you're logged in and provide your session cookie

## Future Updates

When you add FBLA questions or update existing questions:
1. Add the new JSON files to `attached_assets/`
2. Update the file list in `server/routes.ts` (search for "questionFiles")
3. Clear your production database (via Replit console)
4. Run the seed command again

# Render Deployment Guide

## Step-by-Step Instructions

### 1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in with your GitHub account (recommended)

### 2. **Create New Web Service**
   - Click the **"New +"** button (top right)
   - Select **"Web Service"**

### 3. **Connect Your Repository**
   - If first time: Click **"Connect GitHub"** and authorize Render
   - Select your repository: **`APPLEPIE6969/Minecraft`**
   - Click **"Connect"**

### 4. **Configure Settings**

   The `render.yaml` file should auto-configure most settings, but verify:

   **Basic Settings:**
   - **Name**: `minecraft-game` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to you (e.g., Frankfurt, Singapore, Ohio)
   - **Branch**: `main`
   - **Root Directory**: (leave empty - should be `/`)

   **Build & Deploy:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or upgrade later for better performance)

   **Advanced (Optional):**
   - **Auto-Deploy**: `Yes` (redeploys on every push to main branch)
   - **Health Check Path**: `/` (checks if server is running)

### 5. **Create Web Service**
   - Review all settings
   - Click **"Create Web Service"**

### 6. **Wait for Deployment**
   - First deployment takes **2-5 minutes**
   - Watch the build logs:
     - Installing dependencies
     - Building application
     - Starting server
   - Status will change to **"Live"** when ready

### 7. **Get Your URL**
   - Render assigns a URL like: `https://minecraft-game.onrender.com`
   - Copy this URL

### 8. **Test Your Game**
   - Open the URL in your browser
   - The game should load
   - Test controls and features
   - Check browser console for any errors

## Troubleshooting

### If Build Fails:
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### If Server Won't Start:
- Check logs: `Events` tab → View recent logs
- Verify `PORT` environment variable is used (Render provides this automatically)
- Ensure server.js is listening on `process.env.PORT`

### If WebSocket/Socket.IO Issues:
- Free tier has some limitations on WebSocket connections
- Game should still work (falls back to polling)
- Consider upgrading to paid plan for better WebSocket support

### If 404 Errors:
- Ensure `index.html` is in root directory
- Verify `express.static(__dirname)` is serving static files correctly

## Updating Your Deployment

After making code changes:
1. Commit changes: `git add . && git commit -m "Your message"`
2. Push to GitHub: `git push origin main`
3. Render will automatically redeploy (if auto-deploy is enabled)
4. Or manually click "Manual Deploy" → "Deploy latest commit"

## Environment Variables

No additional environment variables needed! The server automatically uses:
- `process.env.PORT` - Provided by Render automatically

## Custom Domain (Optional)

1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Monitoring

- **Logs**: View real-time logs in Render dashboard
- **Metrics**: CPU, Memory, Response times
- **Events**: Deployment history and events

---

**Need Help?** Check Render documentation: https://render.com/docs

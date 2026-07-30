# Daily Blog Post Automation - Windows Setup Guide

## Option 1: Using Windows Task Scheduler

### Step 1: Create a Batch File

Create a file named `daily-blog-post.bat` in your project root:

```batch
@echo off
cd /d "C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io"
echo Running daily blog post generator...
pnpm run daily-post -- "%~1"
pause
```

### Step 2: Schedule with Task Scheduler

1. Open **Task Scheduler** (search in Start menu)
2. Click **Create Basic Task**
3. Name: "Daily Blog Post Generator"
4. Trigger: **Daily** at your preferred time (e.g., 9:00 AM)
5. Action: **Start a program**
   - Program: `C:\Windows\System32\cmd.exe`
   - Arguments: `/c "C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io\daily-blog-post.bat"`
6. Finish and test

---

## Option 2: Using PowerShell Script with Scheduled Task

Create `daily-blog-post.ps1`:

```powershell
# Navigate to project directory
Set-Location "C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io"

# Get today's topic (you can customize this)
$topic = "Daily Tech Insights - $(Get-Date -Format 'yyyy-MM-dd')"

# Run the daily post script
Write-Host "Generating daily blog post..." -ForegroundColor Cyan
pnpm run daily-post -- $topic

Write-Host "Done!" -ForegroundColor Green
```

Schedule it:
```powershell
# Run in PowerShell as Administrator
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io\daily-blog-post.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "Daily Blog Post" -Action $action -Trigger $trigger -User $env:USERNAME
```

---

## Option 3: Manual Daily Routine (Recommended for Quality Control)

Add this to your daily workflow:

```powershell
# Quick one-liner to create and commit a daily post
cd C:\Users\LiuRowanChunfeng\Projects\xinda\llccing.github.io
pnpm run daily-post -- "Your Topic Here"
```

---

## Tips for Windows Users

1. **Git Credentials**: Make sure Git credentials are cached to avoid repeated login prompts:
   ```bash
   git config --global credential.helper wincred
   ```

2. **Node.js Path**: Ensure Node.js is in your system PATH

3. **pnpm Installation**: If pnpm isn't globally installed:
   ```bash
   npm install -g pnpm
   ```

4. **Testing**: Test your scheduled task manually before relying on automation:
   ```powershell
   # Run task manually
   schtasks /run /tn "Daily Blog Post"
   ```

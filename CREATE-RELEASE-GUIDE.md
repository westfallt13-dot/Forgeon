# Creating GitHub Release v1.0.0

## Quick Steps

### 1. Go to Releases Page
Visit: https://github.com/beachfall/Forgeon/releases/new

### 2. Fill in Release Information

**Choose a tag**: `v1.0.0`
- Click "Create new tag: v1.0.0 on publish"

**Release title**: `v1.0.0 - First Official Release`

**Description**: Copy and paste the content from `RELEASE-NOTES-v1.0.0.md`

### 3. Upload Files

Drag and drop or click "Attach binaries":
- `build/Forgeon-Game-Planner-1.0.0-Windows-x64.zip` (506 MB)
- `build/SHA256SUMS.txt`

### 4. Publish

- ✅ Check "Set as the latest release"
- Click **"Publish release"**

---

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```powershell
cd "d:\Custom Builds\GameDev Planner"

gh release create v1.0.0 `
  "build\Forgeon-Game-Planner-1.0.0-Windows-x64.zip" `
  "build\SHA256SUMS.txt" `
  --title "v1.0.0 - First Official Release" `
  --notes-file RELEASE-NOTES-v1.0.0.md
```

---

## After Publishing

Your release will be available at:
**https://github.com/beachfall/Forgeon/releases/tag/v1.0.0**

Share this link with your instructors:
**https://github.com/beachfall/Forgeon/releases**

---

## Sharing with Instructors

Send them:

```
Hi,

I've completed Forgeon Game Planner v1.0.0. You can download it here:

https://github.com/beachfall/Forgeon/releases

Click on "Forgeon-Game-Planner-1.0.0-Windows-x64.zip" to download.

Installation:
1. Extract the ZIP file
2. Run "Forgeon Game Planner.exe"

No installation required!

Thanks,
Thomas Westfall
```

---

## Files Ready to Upload

Location: `d:\Custom Builds\GameDev Planner\build\`

✅ Forgeon-Game-Planner-1.0.0-Windows-x64.zip (505.52 MB)
✅ SHA256SUMS.txt

Both files are ready!

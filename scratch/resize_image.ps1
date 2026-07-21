Add-Type -AssemblyName System.Drawing

$srcPath = "public/extension-ar/screenshot.png"
$destPath = "public/extension-ar/screenshot_resized.png"
$finalJpgPath = "public/extension-ar/screenshot.jpg"

# Load source image
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

# Create target bitmap 1280x800
$bmp = New-Object System.Drawing.Bitmap(1280, 800, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)

# Get Graphics object
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with a dark background color in case of gaps (090d16)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(9, 13, 22))
$g.FillRectangle($brush, 0, 0, 1280, 800)

# Calculate drawing coordinates for center crop
# Scale to width 1280
$destWidth = 1280
$destHeight = 1280
$destX = 0
$destY = -240 # (1280 - 800) / 2 = 240

# Draw image
$g.DrawImage($srcImg, $destX, $destY, $destWidth, $destHeight)

# Save as JPEG (which never has alpha) to avoid any Chrome Web Store validation issues
$bmp.Save($finalJpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

# Clean up
$g.Dispose()
$bmp.Dispose()
$srcImg.Dispose()

Write-Host "Resized image saved successfully to $finalJpgPath"

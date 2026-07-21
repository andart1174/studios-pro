Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('public/extension-ar/screenshot.jpg')
Write-Host "Width: $($img.Width)"
Write-Host "Height: $($img.Height)"
Write-Host "PixelFormat: $($img.PixelFormat)"
$img.Dispose()

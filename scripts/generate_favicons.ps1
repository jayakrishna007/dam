Add-Type -AssemblyName System.Drawing

$sourcePath = (Get-Item "public/apple-touch-icon.png").FullName
$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

Write-Host "Source image size: $($srcImg.Width)x$($srcImg.Height)"

# Function to save resized PNG
function Save-ResizedPng {
    param (
        [System.Drawing.Image]$src,
        [int]$width,
        [int]$height,
        [string]$outputPath
    )
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.DrawImage($src, 0, 0, $width, $height)
    $g.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved $outputPath ($width x $height)"
}

Save-ResizedPng -src $srcImg -width 48 -height 48 -outputPath "public/favicon-48x48.png"
Save-ResizedPng -src $srcImg -width 192 -height 192 -outputPath "public/icon-192.png"
Save-ResizedPng -src $srcImg -width 512 -height 512 -outputPath "public/icon-512.png"

# Save 48x48 as favicon.ico
$bmp48 = New-Object System.Drawing.Bitmap(48, 48)
$g48 = [System.Drawing.Graphics]::FromImage($bmp48)
$g48.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g48.DrawImage($srcImg, 0, 0, 48, 48)
$g48.Dispose()

$hIcon = $bmp48.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoStream = New-Object System.IO.FileStream("public/favicon.ico", [System.IO.FileMode]::Create)
$icon.Save($icoStream)
$icoStream.Close()
$icon.Dispose()
$bmp48.Dispose()

$srcImg.Dispose()
Write-Host "Successfully generated favicon.ico and high-res PNG favicons!"

Add-Type -AssemblyName System.Drawing

$bhadraPath = (Get-Item "public/images/dams/bhadra.jpg").FullName

$srcImg = [System.Drawing.Bitmap]::FromFile($bhadraPath)
$w = $srcImg.Width
$h = $srcImg.Height
Write-Host "Original Bhadra image size: ${w}x${h}"

$enhanced = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($enhanced)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$matrix = [float[][]]@(
    [float[]]@(1.2,  0.0,  0.0,  0.0, 0.0),
    [float[]]@(0.0,  1.2,  0.0,  0.0, 0.0),
    [float[]]@(0.0,  0.0,  1.25, 0.0, 0.0),
    [float[]]@(0.0,  0.0,  0.0,  1.0, 0.0),
    [float[]]@(-0.06, -0.06, -0.06, 0.0, 1.0)
)
$cm = New-Object System.Drawing.Imaging.ColorMatrix (,$matrix)
$ia = New-Object System.Drawing.Imaging.ColorMatrix
$imgAttrs = New-Object System.Drawing.Imaging.ImageAttributes
$imgAttrs.SetColorMatrix($cm)

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$g.DrawImage($srcImg, $rect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel, $imgAttrs)

$srcImg.Dispose()
$g.Dispose()

$outputPath = "public/images/dams/bhadra_crisp.jpg"
$enhanced.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$enhanced.Dispose()

Move-Item -Path $outputPath -Destination "public/images/dams/bhadra.jpg" -Force
Write-Host "Successfully enhanced Bhadra dam photo to crisp high contrast vibrancy!"

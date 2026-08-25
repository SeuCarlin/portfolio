param(
  [string]$SourceRoot = 'D:\NECESSARIOS\ARTES',
  [string]$ProjectRoot = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not $ProjectRoot) {
  $ProjectRoot = Split-Path -Parent $PSScriptRoot
}

$galleryRoot = Join-Path $ProjectRoot 'assets\gallery'
if (-not (Test-Path -LiteralPath $galleryRoot)) {
  New-Item -ItemType Directory -Path $galleryRoot | Out-Null
}

function ConvertTo-Slug([string]$value) {
  $normalized = $value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($character in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($character) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($character)
    }
  }
  return ($builder.ToString().ToLowerInvariant() -replace '[^a-z0-9]+', '-' -replace '(^-|-$)', '')
}

function Get-CleanTitle([string]$name) {
  $title = [IO.Path]::GetFileNameWithoutExtension($name)
  $title = $title -replace '^carlos-lima-', ''
  $title = $title -replace '_\d{10,}$', ''
  $title = $title -replace '\s+copiar(?:\s*\(\d+\))?$', ''
  $title = $title -replace '[-_]+', ' '
  return (Get-Culture).TextInfo.ToTitleCase($title.ToLowerInvariant()).Trim()
}

function Export-WebImage([string]$source, [string]$destination) {
  $image = [Drawing.Image]::FromFile($source)
  try {
    $longestSide = [Math]::Max($image.Width, $image.Height)
    $scale = [Math]::Min(1, 1800 / $longestSide)
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
    $bitmap = [Drawing.Bitmap]::new($width, $height, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([Drawing.Color]::FromArgb(17, 19, 18))
        $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $jpegCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
      $encoderParameters = [Drawing.Imaging.EncoderParameters]::new(1)
      try {
        $quality = [Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, [long]84)
        $encoderParameters.Param[0] = $quality
        $bitmap.Save($destination, $jpegCodec, $encoderParameters)
        $quality.Dispose()
      } finally {
        $encoderParameters.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

$categories = [Collections.Generic.List[object]]::new()
$supportedExtensions = @('.png', '.jpg', '.jpeg', '.jfif', '.webp')

foreach ($categoryDirectory in Get-ChildItem -LiteralPath $SourceRoot -Directory | Sort-Object Name) {
  $sourceFiles = Get-ChildItem -LiteralPath $categoryDirectory.FullName -File -Recurse |
    Where-Object { $_.Extension.ToLowerInvariant() -in $supportedExtensions } |
    Sort-Object FullName

  if ($sourceFiles.Count -eq 0) { continue }

  $categorySlug = ConvertTo-Slug $categoryDirectory.Name
  $categoryOutput = Join-Path $galleryRoot $categorySlug
  if (-not (Test-Path -LiteralPath $categoryOutput)) {
    New-Item -ItemType Directory -Path $categoryOutput | Out-Null
  }

  $items = [Collections.Generic.List[object]]::new()
  $index = 0
  foreach ($sourceFile in $sourceFiles) {
    $index += 1
    $extension = $sourceFile.Extension.ToLowerInvariant()
    $outputExtension = if ($extension -eq '.webp') { '.webp' } else { '.jpg' }
    $outputName = '{0:D3}{1}' -f $index, $outputExtension
    $outputPath = Join-Path $categoryOutput $outputName

    try {
      if ($extension -eq '.webp') {
        Copy-Item -LiteralPath $sourceFile.FullName -Destination $outputPath -Force
      } else {
        Export-WebImage $sourceFile.FullName $outputPath
      }
    } catch {
      Write-Warning "Não foi possível importar $($sourceFile.FullName): $($_.Exception.Message)"
      continue
    }

    $relativeProject = $sourceFile.DirectoryName.Substring($categoryDirectory.FullName.Length).TrimStart('\')
    $project = if ($relativeProject) { $relativeProject -replace '\\', ' / ' } else { $categoryDirectory.Name }
    $cleanTitle = Get-CleanTitle $sourceFile.Name
    if ($cleanTitle -match '^[0-9a-f]{12,}(?:\.|$)') {
      $cleanTitle = if ($relativeProject) {
        (Get-Culture).TextInfo.ToTitleCase(($relativeProject -split '\\')[-1].ToLowerInvariant())
      } else {
        "Arte $index"
      }
    }
    $relativeOutput = "assets/gallery/$categorySlug/$outputName"
    $items.Add([ordered]@{
      src = $relativeOutput
      title = $cleanTitle
      project = $project
    })
  }

  if ($items.Count -gt 0) {
    $categories.Add([ordered]@{
      id = $categorySlug
      name = (Get-Culture).TextInfo.ToTitleCase($categoryDirectory.Name.ToLowerInvariant())
      count = $items.Count
      items = $items
    })
  }
}

$json = $categories | ConvertTo-Json -Depth 6
$manifest = "window.galleryData = $json;`r`n"
[IO.File]::WriteAllText((Join-Path $ProjectRoot 'gallery-data.js'), $manifest, [Text.UTF8Encoding]::new($false))

$total = ($categories | ForEach-Object count | Measure-Object -Sum).Sum
Write-Output "Categorias: $($categories.Count)"
Write-Output "Imagens importadas: $total"

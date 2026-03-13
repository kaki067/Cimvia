param(
  [int]$Port = 8000
)

$root = [System.IO.Path]::GetFullPath((Get-Location).Path)
$prefix = "http://localhost:$Port/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Serving $root at $prefix"

function Get-ContentType([string]$path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".js"   { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".gif"  { "image/gif" }
    ".svg"  { "image/svg+xml" }
    ".webp" { "image/webp" }
    ".ico"  { "image/x-icon" }
    default { "application/octet-stream" }
  }
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($requestPath) -or $requestPath -eq "/") { $requestPath = "/index.html" }

    $relative = $requestPath.TrimStart("/")
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

    if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $context.Response.ContentType = "text/plain; charset=utf-8"
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.Close()
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($candidate)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = Get-ContentType $candidate
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}


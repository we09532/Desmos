param(
  [string]$Url = "https://<your-deploy>.vercel.app/api/gemini"
)

# Simple test script to POST a prompt to the deployed /api/gemini proxy and print the raw response.
# Usage:
#   .\test-proxy.ps1 -Url "https://desmos-scientific.vercel.app/api/gemini"

$body = @{ prompt = "Test prompt from test-proxy.ps1" } | ConvertTo-Json

try {
  $resp = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $body -ErrorAction Stop
  Write-Host "Success. Parsed response (formatted JSON):" -ForegroundColor Green
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  # If the server returned a response body, try to read it for diagnostics
  try {
    $r = $_.Exception.Response
    if ($r -ne $null) {
      $stream = $r.GetResponseStream()
      $sr = New-Object System.IO.StreamReader($stream)
      $text = $sr.ReadToEnd()
      Write-Host "Response body:" -ForegroundColor Yellow
      Write-Host $text
    } else {
      Write-Host ($_ | Out-String)
    }
  } catch {
    Write-Host "Failed to read error response body." -ForegroundColor Yellow
    Write-Host ($_ | Out-String)
  }
  exit 1
}

param(
  [ValidatePattern('^F\d{3}$')]
  [string]$FindingId = 'F001'
)

$ErrorActionPreference = 'Stop'
$secret = Read-Host '粘贴 OpenAI API key（输入不会显示）' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}

$runCode = 1
try {
  & node (Join-Path $PSScriptRoot 'src\cli.mjs') ask $FindingId
  $runCode = $LASTEXITCODE
} finally {
  Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
}
exit $runCode

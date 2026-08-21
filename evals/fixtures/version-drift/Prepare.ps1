param([Parameter(Mandatory=$true)][ValidateSet('code','code-a','code-b')][string]$Account)

$state = Get-Content -LiteralPath "$PSScriptRoot/state.json" -Raw | ConvertFrom-Json
$expectedRuntime = '26.814.41407'
if ($state.installedExtensionVersion -ne $expectedRuntime) {
    throw "Extension $($state.installedExtensionVersion) does not match runtime $expectedRuntime"
}

Write-Output "$Account|$expectedRuntime"

$ErrorActionPreference = "Stop"

$ContainerName = "trademarkiq2-db-1"
$DbUser = "postgres"
$DbName = "trademarkiq"

$BackupDir = Join-Path $env:USERPROFILE "OneDrive\Backups\trademarkiq"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$BackupFile = Join-Path $BackupDir ("trademarkiq_" + $Timestamp + ".sql")

Write-Output ("Creating backup: " + $BackupFile)

$dump = & docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

$dump | Out-File -FilePath $BackupFile -Encoding utf8

# Optional retention: delete backups older than 30 days
Get-ChildItem -Path $BackupDir -Filter "trademarkiq_*.sql" -File -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

Write-Output "Backup complete."

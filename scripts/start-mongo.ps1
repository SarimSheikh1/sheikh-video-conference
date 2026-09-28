$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MongoExe = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe'
$DataDir = Join-Path $ProjectRoot '.mongo-data'

if (!(Test-Path $MongoExe)) {
  Write-Error "MongoDB executable was not found at $MongoExe. Repair or reinstall MongoDB Community Server."
  exit 1
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
Write-Host "Starting MongoDB on 127.0.0.1:27017 using $DataDir"
& $MongoExe --dbpath $DataDir --bind_ip 127.0.0.1 --port 27017

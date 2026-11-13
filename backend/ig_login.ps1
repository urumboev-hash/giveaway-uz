param([string]$User = "urumboyevolimjon")
# Вход в Instagram: пароль вводится здесь (скрыто) и не сохраняется.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$secure = Read-Host "Пароль Instagram для $User (не отображается, затем Enter)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:IG_LOGIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:PYTHONIOENCODING = 'utf-8'
    & (Join-Path $here '.venv\Scripts\python.exe') -W ignore (Join-Path $here 'ig_login.py') $User
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Item Env:IG_LOGIN_PASSWORD -ErrorAction SilentlyContinue
}

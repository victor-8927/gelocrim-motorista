$path = "C:\gelocrim-motorista\screens\EntregaScreen.js"
$content = Get-Content $path -Raw -Encoding UTF8

# Corrigir o useState quebrado - fechar com });
$content = $content -replace "useState\(\{ nf: null, boleto: null, comodato: null, outros: null`r?`n\s*fotosRow:.*?gpsTxt.*?\},", "useState({ nf: null, boleto: null, comodato: null, outros: null });",[System.Text.RegularExpressions.RegexOptions]::Singleline

# Adicionar estilos antes do ultimo });
$estilos = @"

  fotosRow: { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  fotoQuadrado: { width:'48%', height:150, backgroundColor:'rgba(0,30,60,0.9)', borderRadius:16, borderWidth:2, borderColor:'rgba(0,200,255,0.4)', borderStyle:'dashed', alignItems:'center', justifyContent:'center', padding:10 },
  fotoQuadradoOk: { borderColor:'#00FF88', borderStyle:'solid', backgroundColor:'rgba(0,255,136,0.1)' },
  fotoThumb: { width:'100%', height:100, borderRadius:10, resizeMode:'cover' },
  fotoEmoji: { fontSize:44, marginBottom:6 },
  fotoQuadLbl: { fontSize:11, fontWeight:'800', color:'#90afd4', letterSpacing:1, textAlign:'center', marginTop:4 },
  fotoObrig: { position:'absolute', top:6, right:8, color:'#FF3355', fontSize:18, fontWeight:'900' },
  fotoHint: { color:'#666', fontSize:11, textAlign:'center', marginBottom:12 },
  gpsBar: { backgroundColor:'rgba(0,255,136,0.08)', borderRadius:8, padding:8, marginBottom:8, borderWidth:1, borderColor:'rgba(0,255,136,0.2)' },
  gpsTxt: { color:'#00FF88', fontSize:10, textAlign:'center' },
"@

$lastClose = $content.LastIndexOf("});")
if ($lastClose -ge 0) {
    $content = $content.Substring(0, $lastClose) + $estilos + $content.Substring($lastClose)
    Write-Host "OK: estilos adicionados!"
}

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Arquivo salvo!"

# Verificar linha 22
$lines = Get-Content $path
Write-Host "Linha 22: $($lines[21])"

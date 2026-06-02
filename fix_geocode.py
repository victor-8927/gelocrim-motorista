# -*- coding: utf-8 -*-
f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
c2 = c

# 1. Adicionar estado endereco
c2 = c2.replace(
    "  const viewShotRef = React.useRef(null);",
    """  const viewShotRef = React.useRef(null);
  const [previewEndereco, setPreviewEndereco] = useState(null);"""
)

# 2. Buscar endereco ao abrir preview
c2 = c2.replace(
    """      setPreviewFoto(fotoFinal.uri);
      setPreviewGps(gpsFoto);
      setPreviewTs(agora);
      setPreviewTipo(tipoVisor);
      setVisorAberto(false);""",
    """      setPreviewFoto(fotoFinal.uri);
      setPreviewGps(gpsFoto);
      setPreviewTs(agora);
      setPreviewTipo(tipoVisor);
      setVisorAberto(false);
      if (gpsFoto) {
        try {
          const end = await Location.reverseGeocodeAsync({ latitude: gpsFoto.latitude, longitude: gpsFoto.longitude });
          if (end && end.length > 0) {
            const e = end[0];
            const linha1 = [e.street, e.streetNumber].filter(Boolean).join(', ');
            const linha2 = [e.district, e.city].filter(Boolean).join(', ');
            const linha3 = e.region || '';
            setPreviewEndereco([linha1, linha2, linha3].filter(Boolean).join('\\n'));
          }
        } catch { setPreviewEndereco(null); }
      }"""
)

# 3. Mostrar endereco no preview em vez de coordenadas
c2 = c2.replace(
    "            const gpsStr  = previewGps ? previewGps.latitude.toFixed(5) + ', ' + previewGps.longitude.toFixed(5) : 'GPS indisponivel';",
    "            const gpsStr  = previewEndereco ? previewEndereco : (previewGps ? previewGps.latitude.toFixed(5) + ', ' + previewGps.longitude.toFixed(5) : 'GPS indisponivel');"
)

# 4. Limpar endereco ao confirmar
c2 = c2.replace(
    """      setPreviewFoto(null);
      setPreviewTipo(null);""",
    """      setPreviewFoto(null);
      setPreviewTipo(null);
      setPreviewEndereco(null);"""
)

open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

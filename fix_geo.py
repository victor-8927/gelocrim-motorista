f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
c2 = c.replace(
    "      setPreviewFoto(fotoFinal.uri);",
    "      let enderecoFinal = null;\n      if (gpsFoto) {\n        try {\n          const end = await Location.reverseGeocodeAsync({ latitude: gpsFoto.latitude, longitude: gpsFoto.longitude });\n          if (end && end.length > 0) {\n            const e = end[0];\n            const linha1 = [e.street, e.streetNumber].filter(Boolean).join(', ');\n            const linha2 = [e.district, e.city].filter(Boolean).join(', ');\n            const linha3 = e.region || '';\n            enderecoFinal = [linha1, linha2, linha3].filter(Boolean).join('\\n');\n          }\n        } catch { enderecoFinal = null; }\n      }\n      setPreviewEndereco(enderecoFinal);\n      setPreviewFoto(fotoFinal.uri);"
)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

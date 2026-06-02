f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

old = """      let enderecoFinal = null;
      if (gpsFoto) {
        try {
          const end = await Location.reverseGeocodeAsync({ latitude: gpsFoto.latitude, longitude: gpsFoto.longitude });
          if (end && end.length > 0) {
            const e = end[0];
            const linha1 = [e.street, e.streetNumber].filter(Boolean).join(', ');
            const linha2 = [e.district, e.city].filter(Boolean).join(', ');
            const linha3 = e.region || '';
            enderecoFinal = [linha1, linha2, linha3].filter(Boolean).join('\\n');
          }
        } catch { enderecoFinal = null; }
      }
      setPreviewEndereco(enderecoFinal);
      let enderecoFinal = null;
      if (gpsFoto) {
        try {
          const end = await Location.reverseGeocodeAsync({ latitude: gpsFoto.latitude, longitude: gpsFoto.longitude });
          if (end && end.length > 0) {
            const e = end[0];
            const linha1 = [e.street, e.streetNumber].filter(Boolean).join(', ');
            const linha2 = [e.district, e.city].filter(Boolean).join(', ');
            const linha3 = e.region || '';
            enderecoFinal = [linha1, linha2, linha3].filter(Boolean).join('\\n');
          }
        } catch { enderecoFinal = null; }
      }
      setPreviewEndereco(enderecoFinal);
      setPreviewFoto(fotoFinal.uri);
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

new = """      let enderecoFinal = null;
      if (gpsFoto) {
        try {
          const end = await Location.reverseGeocodeAsync({ latitude: gpsFoto.latitude, longitude: gpsFoto.longitude });
          if (end && end.length > 0) {
            const e = end[0];
            const linha1 = [e.street, e.streetNumber].filter(Boolean).join(', ');
            const linha2 = [e.district, e.city].filter(Boolean).join(', ');
            const linha3 = e.region || '';
            enderecoFinal = [linha1, linha2, linha3].filter(Boolean).join('\\n');
          }
        } catch { enderecoFinal = null; }
      }
      setPreviewEndereco(enderecoFinal);
      setPreviewFoto(fotoFinal.uri);
      setPreviewGps(gpsFoto);
      setPreviewTs(agora);
      setPreviewTipo(tipoVisor);
      setVisorAberto(false);"""

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

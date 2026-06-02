PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8') as f:
    content = f.read()

# Corrigir a tela de preview para usar GPS real + geocodificação reversa
OLD_PREVIEW = """  // TELA PREVIEW FOTO
  if (preview) {
    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR');
    const gpsStr = preview.gps
      ? `GPS: ${preview.gps.latitude.toFixed(5)}, ${preview.gps.longitude.toFixed(5)}`
      : 'GPS: sem sinal';
    return (
      <View style={{flex:1, backgroundColor:'#000'}}>
        <ViewShot ref={viewShotRef} options={{format:'jpg', quality:0.8}} style={{flex:1}}>
          <Image source={{uri: preview.asset.uri}} style={{flex:1, resizeMode:'contain'}}/>
          <View style={s.watermark}>
            <Text style={s.watermarkTxt}>{dataHora}</Text>
            <Text style={s.watermarkTxt}>{stop.address}</Text>
            <Text style={s.watermarkTxt}>Manaus - Amazonas</Text>
            <Text style={s.watermarkTxt}>{gpsStr}</Text>
          </View>
        </ViewShot>"""

NEW_PREVIEW = """  // TELA PREVIEW FOTO
  if (preview) {
    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR');
    const lat = preview.gps?.latitude;
    const lng = preview.gps?.longitude;
    const gpsStr = lat && lng
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : 'GPS: sem sinal';
    const endReal = preview.enderecoReal || (lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Localizacao nao disponivel');
    return (
      <View style={{flex:1, backgroundColor:'#000'}}>
        <ViewShot ref={viewShotRef} options={{format:'jpg', quality:0.8}} style={{flex:1}}>
          <Image source={{uri: preview.asset.uri}} style={{flex:1, resizeMode:'contain'}}/>
          <View style={s.watermark}>
            <Text style={s.watermarkTxt}>{dataHora}</Text>
            <Text style={s.watermarkTxt}>{endReal}</Text>
            <Text style={s.watermarkTxt}>GPS: {gpsStr}</Text>
          </View>
        </ViewShot>"""

if OLD_PREVIEW in content:
    content = content.replace(OLD_PREVIEW, NEW_PREVIEW)
    print("OK: preview corrigido com GPS real!")
else:
    print("AVISO: bloco preview nao encontrado")

# Corrigir tirarFoto para fazer geocodificação reversa
OLD_GPS = """      setPreview({ tipo, asset, gps: gpsAtual });"""
NEW_GPS = """      // Geocodificacao reversa - endereco real onde a foto foi tirada
      let enderecoReal = null;
      try {
        if (gpsAtual) {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: gpsAtual.latitude,
            longitude: gpsAtual.longitude
          });
          if (geocode && geocode.length > 0) {
            const g = geocode[0];
            enderecoReal = [g.street, g.streetNumber, g.district, g.city, g.region]
              .filter(Boolean).join(', ');
          }
        }
      } catch {}
      setPreview({ tipo, asset, gps: gpsAtual, enderecoReal });"""

if OLD_GPS in content:
    content = content.replace(OLD_GPS, NEW_GPS)
    print("OK: geocodificação reversa adicionada!")
else:
    print("AVISO: bloco GPS nao encontrado")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")

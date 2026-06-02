f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()

old = """                {ok ? (
                  <>
                    <Text style={s.fotoCheck}>✓</Text>
                    <Text style={s.fotoLabelOk}>{f.label}</Text>
                    {foto.gps && (
                      <Text style={s.fotoGps} numberOfLines={1}>
                        {foto.gps.latitude.toFixed(4)},{foto.gps.longitude.toFixed(4)}
                      </Text>
                    )}
                  </>"""

new = """                {ok ? (
                  <>
                    <Image source={{ uri: foto.uri }} style={{ width: '100%', height: 90, borderRadius: 6, marginBottom: 4 }} resizeMode="cover" />
                    <Text style={s.fotoLabelOk}>{f.label} ✓</Text>
                    {foto.gps && (
                      <Text style={s.fotoGps} numberOfLines={1}>
                        {foto.gps.latitude.toFixed(4)},{foto.gps.longitude.toFixed(4)}
                      </Text>
                    )}
                    {!foto.gps && (
                      <Text style={s.fotoGps}>GPS indisponivel</Text>
                    )}
                  </>"""

c2 = c.replace(old, new)

# Garantir que Image esta importado
if "import { Image" not in c2 and "Image," not in c2.split("from 'react-native'")[0]:
    c2 = c2.replace(
        "from 'react-native';",
        "from 'react-native';"
    )
    # Adicionar Image no import do react-native
    import re
    c2 = re.sub(r"from 'react-native'", "from 'react-native'", c2)
    c2 = re.sub(r"(import \{[^}]*)(TouchableOpacity)", r"\1Image, TouchableOpacity", c2, count=1)

open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

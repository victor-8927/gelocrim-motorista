caminho = r"C:\gelocrim-motorista\screens\RotaScreen.js"
with open(caminho, encoding="utf-8", errors="ignore") as f:
    data = f.read()

# Adicionar import AsyncStorage
if "AsyncStorage" not in data:
    data = data.replace(
        "import * as Location from 'expo-location';",
        "import * as Location from 'expo-location';\nimport AsyncStorage from '@react-native-async-storage/async-storage';"
    )
    print("OK - AsyncStorage importado!")

# Corrigir tela semRota para ter botao Sair
antigo = """  if (semRota) return (
    <View style={s.center}>
      <Text style={{ fontSize: 52 }}>⏳</Text>
      <Text style={s.titulo}>Aguardando Liberacao</Text>
      <Text style={s.sub}>Sua rota ainda nao foi liberada.{\'\\n\'}Aguarde o analista.</Text>
      <TouchableOpacity style={s.btnSec} onPress={carregarRota}>
        <Text style={s.btnSecTxt}>🔄 Verificar</Text>
      </TouchableOpacity>
    </View>
  );"""

novo = """  async function fazerLogout() {
    await AsyncStorage.removeItem('fleet_token');
    await AsyncStorage.removeItem('fleet_user');
    navigation.replace('Login');
  }

  if (semRota) return (
    <View style={s.center}>
      <Text style={{ fontSize: 52 }}>⏳</Text>
      <Text style={s.titulo}>Aguardando Liberacao</Text>
      <Text style={s.sub}>Sua rota ainda nao foi liberada.{'\\n'}Aguarde o analista.</Text>
      <TouchableOpacity style={s.btnSec} onPress={carregarRota}>
        <Text style={s.btnSecTxt}>🔄 Verificar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.btnSec, {marginTop:12, borderColor:'rgba(255,80,80,0.3)'}]} onPress={fazerLogout}>
        <Text style={[s.btnSecTxt, {color:'#ff5050'}]}>Sair</Text>
      </TouchableOpacity>
    </View>
  );"""

if antigo in data:
    data = data.replace(antigo, novo)
    print("OK - botao Sair adicionado!")
else:
    print("Nao encontrado")

with open(caminho, "w", encoding="utf-8") as f:
    f.write(data)
print("Salvo!")

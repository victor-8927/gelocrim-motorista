path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Substitui o loading screen por um que mostra debug
old_loading = '''  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadFlake}>❄</Text>
      <ActivityIndicator size="large" color="#64B4FF" style={{ marginTop:16 }} />
      <Text style={styles.loadTxt}>Carregando sua rota...</Text>
    </View>
  );'''

new_loading = '''  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadFlake}>❄</Text>
      <ActivityIndicator size="large" color="#64B4FF" style={{ marginTop:16 }} />
      <Text style={styles.loadTxt}>Carregando sua rota...</Text>
      <Text style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:8 }}>
        {hoje} · {API_URL}
      </Text>
    </View>
  );'''

content = content.replace(old_loading, new_loading)

# Substitui o semRota para mostrar mais info
old_semrota = '''  if (semRota) return (
    <View style={styles.aguardando}>
      <Text style={{ fontSize:56 }}>⏳</Text>
      <Text style={styles.aguardTitulo}>Aguardando Liberação</Text>
      <Text style={styles.aguardSub}>Sua rota ainda não foi autorizada.{\'\\n\'}Aguarde o analista liberar.</Text>
      <TouchableOpacity style={styles.btnVerif} onPress={() => { setLoading(true); setSemRota(false); carregarRota(); }}>
        <Text style={styles.btnVerifTxt}>🔄  Verificar Novamente</Text>
      </TouchableOpacity>
    </View>
  );'''

new_semrota = '''  if (semRota) return (
    <View style={styles.aguardando}>
      <Text style={{ fontSize:56 }}>⏳</Text>
      <Text style={styles.aguardTitulo}>Aguardando Liberação</Text>
      <Text style={styles.aguardSub}>Sua rota ainda não foi autorizada.{'\\n'}Aguarde o analista liberar.</Text>
      <Text style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:8, textAlign:'center' }}>
        Data: {hoje}{'\n'}{API_URL}
      </Text>
      <TouchableOpacity style={styles.btnVerif} onPress={() => { setLoading(true); setSemRota(false); carregarRota(); }}>
        <Text style={styles.btnVerifTxt}>🔄  Verificar Novamente</Text>
      </TouchableOpacity>
    </View>
  );'''

content = content.replace(old_semrota, new_semrota)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Debug visual adicionado!')
print('Pressione r no Expo!')

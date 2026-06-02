path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove o debug com erro de sintaxe
old_bad = """      <Text style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:8, textAlign:'center' }}>
        Data: {hoje}{'
'}{ API_URL}
      </Text>"""

# Tenta remover qualquer variacao do texto com problema
import re
content = re.sub(
    r"<Text style=\{\{ color:'rgba\(255,255,255,0\.3\)'.*?\}\}>.*?Data:.*?</Text>",
    '',
    content,
    flags=re.DOTALL
)

# Adiciona Alert de debug na funcao carregarRota
old_catch = "    } catch { Alert.alert('Erro','Não foi possível carregar a rota.'); }"
new_catch = "    } catch(e) { Alert.alert('Erro', e.message || String(e)); }"
content = content.replace(old_catch, new_catch)

# Adiciona Alert quando nao tem rotas
old_semrota = "      if (!validas || validas.length === 0) { setSemRota(true); setLoading(false); return; }"
new_semrota = "      if (!validas || validas.length === 0) { Alert.alert('Debug', `Rotas encontradas: ${rotas.length}, validas: ${validas.length}, data: ${hoje}`); setSemRota(true); setLoading(false); return; }"
content = content.replace(old_semrota, new_semrota)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Corrigido! Pressione r no Expo.')

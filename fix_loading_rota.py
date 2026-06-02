path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Corrige carregarRota para nao esperar rota pelas ruas
old_await = "      await carregarRotaRuas(sorted);"
new_await = "      // Carrega rota pelas ruas em background sem bloquear\n      carregarRotaRuas(sorted);"

content = content.replace(old_await, new_await)

# Remove o setLoading(false) do finally e coloca antes do carregarRotaRuas
old_finally = "    } catch(e) { console.log('Erro carregarRota:', e); Alert.alert('Erro', 'Nao foi possivel carregar a rota.'); }\n    finally { setLoading(false); }"
new_finally = "    } catch(e) { console.log('Erro:', e); Alert.alert('Erro', 'Nao foi possivel carregar a rota: ' + String(e)); setLoading(false); }"

content = content.replace(old_finally, new_finally)

# Garante que setLoading(false) seja chamado antes de carregarRotaRuas
old_sorted = """      setStops(sorted);
      setTimeout(() => {"""
new_sorted = """      setStops(sorted);
      setLoading(false);
      setTimeout(() => {"""

content = content.replace(old_sorted, new_sorted)

# Remove o finally duplicado se existir
content = content.replace("    finally { setLoading(false); }", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('RotaScreen corrigido! Pressione r no Expo.')

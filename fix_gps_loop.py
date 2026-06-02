path = r'C:\gelocrim-motorista\screens\RotaScreen.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Corrige o watchPositionAsync para usar useRef e nao causar re-render
old_watch = """      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 50 },
        (l) => setPosicao({ latitude: l.coords.latitude, longitude: l.coords.longitude })
      );"""

new_watch = """      // Atualiza posicao sem causar re-render excessivo
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 100 },
        (l) => setPosicao(prev => {
          const newPos = { latitude: l.coords.latitude, longitude: l.coords.longitude };
          if (prev && Math.abs(prev.latitude - newPos.latitude) < 0.0001) return prev;
          return newPos;
        })
      );"""

content = content.replace(old_watch, new_watch)

# Remove o Alert de debug que causa loop
content = content.replace(
    "Alert.alert('Debug', `Rotas encontradas: ${rotas.length}, validas: ${validas.length}, data: ${hoje}`); ",
    ""
)

# Remove o Alert de debug do catch
content = content.replace(
    "    } catch(e) { Alert.alert('Erro', e.message || String(e)); }",
    "    } catch(e) { console.log('Erro carregarRota:', e); Alert.alert('Erro', 'Nao foi possivel carregar a rota.'); }"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('GPS corrigido! Pressione r no Expo.')

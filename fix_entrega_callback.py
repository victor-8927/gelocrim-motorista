PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8', errors='ignore') as f:
    content = f.read()

changes = 0

# 1. Adicionar onStopUpdated nos params
OLD_PARAMS = "  const { stop, token, routeId, proximoStop } = route.params;"
NEW_PARAMS = "  const { stop, token, routeId, proximoStop, onStopUpdated } = route.params;"

if OLD_PARAMS in content:
    content = content.replace(OLD_PARAMS, NEW_PARAMS)
    changes += 1
    print("OK: onStopUpdated adicionado nos params!")

# 2. Chamar onStopUpdated antes de cada goBack
# Substituir todos os navigation.goBack() por versao que chama onStopUpdated
import re

# Substituir goBack apos entrega bem sucedida (completed)
content = content.replace(
    "{ text: 'Proximo', onPress: () => navigation.goBack() }",
    "{ text: 'Proximo', onPress: () => { if(onStopUpdated) onStopUpdated(stop.stop_id, 'completed'); navigation.goBack(); } }"
)
changes += 1
print("OK: goBack pos-entrega corrigido!")

# Substituir goBack apos nao entregue (failed)
content = content.replace(
    "[{ text: 'OK', onPress: () => navigation.goBack() }]",
    "[{ text: 'OK', onPress: () => { if(onStopUpdated) onStopUpdated(stop.stop_id, 'failed'); navigation.goBack(); } }]"
)
changes += 1
print("OK: goBack nao-entregue corrigido!")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{changes} correcoes! Reinicie o Expo!")

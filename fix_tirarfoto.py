PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Corrigir funcao tirarFoto - salvar no tipo correto
OLD = """    if (!result.canceled) {
      const asset = result.assets[0];
      if (tipo === 'outros') {
        setFotos(p => ({ ...p, outros: [...p.outros, asset] }));
      } else {
        setFotos(p => ({ ...p, canhoto: asset }));
      }
    }
  }"""

NEW = """    if (!result.canceled) {
      const asset = result.assets[0];
      setFotos(p => ({ ...p, [tipo]: asset }));
    }
  }"""

if OLD in content:
    content = content.replace(OLD, NEW)
    print("OK: tirarFoto corrigido!")
else:
    print("AVISO: bloco nao encontrado")

# Corrigir confirmarEntrega - passar status correto no callback
OLD_CB = "          [{ text: 'OK', onPress: () => { if(onStopUpdated) onStopUpdated(stop.stop_id, 'failed'); navigation.goBack(); } }]"
NEW_CB = "          [{ text: 'OK', onPress: () => { if(onStopUpdated) onStopUpdated(stop.stop_id, 'completed'); navigation.goBack(); } }]"

if OLD_CB in content:
    content = content.replace(OLD_CB, NEW_CB)
    print("OK: callback completed corrigido!")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")

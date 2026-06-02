data = open(r'C:\gelocrim-motorista\screens\RotaScreen.js', encoding='utf-8', errors='ignore').read()
# Buscar todas ocorrencias de setRouteCoords
import re
for m in re.finditer(r'setRouteCoords', data):
    idx = m.start()
    print(f"\n=== pos {idx} ===")
    print(data[max(0,idx-50):idx+200])

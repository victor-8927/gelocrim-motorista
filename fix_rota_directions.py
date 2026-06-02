caminho = r"C:\gelocrim-motorista\screens\RotaScreen.js"
with open(caminho, encoding="utf-8", errors="ignore") as f:
    data = f.read()

# Verificar se decodePolyline esta definida
if 'function decodePolyline' in data:
    print("decodePolyline JA EXISTE")
else:
    print("decodePolyline NAO EXISTE - adicionando...")
    # Adicionar antes do export default
    funcao = """
function decodePolyline(encoded) {
  const poly = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return poly;
}

"""
    data = data.replace("export default function RotaScreen", funcao + "export default function RotaScreen")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(data)
    print("OK - decodePolyline adicionada!")

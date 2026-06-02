f = "C:/gelocrim-motorista/screens/AssistenteGelocrim.js"
c = open(f, encoding="utf-8").read()

old = """async function falar(texto) {
  try {
    Speech.stop();
    // Buscar vozes disponiveis e preferir masculina
    const vozes = await Speech.getAvailableVoicesAsync();"""

new = """async function falar(texto) {
  if (!texto) return;
  try {
    Speech.stop();
    // Buscar vozes disponiveis e preferir masculina
    const vozes = await Speech.getAvailableVoicesAsync();"""

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

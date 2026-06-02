PATH = r'C:\gelocrim-motorista\screens\EntregaScreen.js'

with open(PATH, encoding='utf-8', errors='ignore') as f:
    content = f.read()

OLD = """    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images', quality: 0.5, base64: true
    });"""

NEW = """    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.4,
      base64: true,
      exif: false,
    });"""

if OLD in content:
    content = content.replace(OLD, NEW)
    print("OK: camera config corrigida!")
else:
    print("AVISO: nao encontrado")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Reinicie o Expo!")

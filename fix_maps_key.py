path = r'C:\gelocrim-motorista\android\app\src\main\AndroidManifest.xml'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Adiciona a chave do Google Maps antes do </application>
maps_key = '    <meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M"/>\n'

if 'com.google.android.geo.API_KEY' in content:
    print("Chave já existe!")
else:
    content = content.replace('  </application>', maps_key + '  </application>')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Chave adicionada!")

# Verifica
if 'com.google.android.geo.API_KEY' in open(path).read():
    print("✅ Confirmado no arquivo!")

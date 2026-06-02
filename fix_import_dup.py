f = "C:/gelocrim-motorista/screens/EntregaScreen.js"
c = open(f, encoding="utf-8").read()
# Remove a segunda ocorrencia do import duplicado
old = "import * as ImageManipulator from 'expo-image-manipulator';\nimport * as ImageManipulator from 'expo-image-manipulator';"
new = "import * as ImageManipulator from 'expo-image-manipulator';"
c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

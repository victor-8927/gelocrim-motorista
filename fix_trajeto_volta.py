f = "C:/gelocrim-motorista/screens/RotaScreen.js"
c = open(f, encoding="utf-8").read()

old = "          const wps = coords.slice(0,-1).map(c=>c.latitude+','+c.longitude).join('|');\n          const dest = coords[coords.length-1];\n          const url = 'https://maps.googleapis.com/maps/api/directions/json?origin='+DEPOSITO.latitude+','+DEPOSITO.longitude+'&destination='+dest.latitude+','+dest.longitude+'&waypoints='+wps+'&key=AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';"

new = "          const wps = coords.map(c=>c.latitude+','+c.longitude).join('|');\n          const dest = DEPOSITO;\n          const url = 'https://maps.googleapis.com/maps/api/directions/json?origin='+DEPOSITO.latitude+','+DEPOSITO.longitude+'&destination='+dest.latitude+','+dest.longitude+'&waypoints='+wps+'&key=AIzaSyB47DpEZW4qbU74LxcG1ZD76cYLRlJw88M';"

c2 = c.replace(old, new)
open(f, "w", encoding="utf-8").write(c2)
print("OK!" if c != c2 else "NAO ALTEROU")

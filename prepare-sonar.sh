#!/bin/bash
# prepare-sonar.sh

# Navegamos al directorio del proyecto dentro del contenedor
cd /usr/src

# Ejecutamos el script de conversión primero
echo "Ejecutando script de conversión de pruebas..."
node convert-junit-to-sonar.js

# Verificamos si el archivo se generó correctamente
if [ -f "test-results/sonar-report.xml" ]; then
  echo "Archivo sonar-report.xml generado correctamente."
else
  echo "ERROR: No se pudo generar el archivo sonar-report.xml"
  exit 1
fi

# Continuamos con el análisis de SonarQube
echo "Iniciando análisis de SonarQube..."
sonar-scanner "$@"

# "test:sonar": "npm test && node convert-junit-to-sonar.js",
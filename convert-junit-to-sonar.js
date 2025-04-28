// convert-junit-to-sonar.js
import fs from 'fs';
import path from 'path';

// Rutas de archivos
const junitPath = path.resolve('./test-results/junit/junit.xml');
const sonarPath = path.resolve('./test-results/sonar-report.xml');

// Mapeo de nombres de pruebas a archivos de PRUEBA (no a archivos de implementación)
const fileMap = {
  'Loan Controller': '__tests__/controllers/controller.loan.test.js',
  'Auth Controller': '__tests__/controllers/controller.auth.test.js',
  'Report Controller': '__tests__/controllers/controller.report.test.js',
  'Transaction Controller': '__tests__/controllers/controller.transaction.test.js',
  'User Controller': '__tests__/controllers/controller.user.test.js'
};

try {
  // Asegurar que el directorio de destino existe
  const sonarDir = path.dirname(sonarPath);
  if (!fs.existsSync(sonarDir)) {
    fs.mkdirSync(sonarDir, { recursive: true });
  }

  // Leer el archivo JUnit
  console.log(`Leyendo archivo JUnit desde: ${junitPath}`);
  const junitXml = fs.readFileSync(junitPath, 'utf8');
  
  // Crear XML en formato SonarQube
  let sonarXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sonarXml += '<testExecutions version="1">\n';
  
  // Extraer testsuite para obtener el controlador
  const testSuiteRegex = /<testsuite name="([^"]*)".*?<\/testsuite>/gs;
  let suiteMatch;
  
  while ((suiteMatch = testSuiteRegex.exec(junitXml)) !== null) {
    const suiteName = suiteMatch[1];
    const suiteXml = suiteMatch[0];
    const filePath = fileMap[suiteName] || `__tests__/unknown-${suiteName.toLowerCase().replace(/\s+/g, '-')}.test.js`;
    
    // Extraer casos de prueba de esta suite
    const testCaseRegex = /<testcase.*?(?:<\/testcase>|<\/testsuite>)/gs;
    let caseMatch;
    
    sonarXml += `  <file path="${filePath}">\n`;
    
    while ((caseMatch = testCaseRegex.exec(suiteXml)) !== null) {
      const testCaseXml = caseMatch[0];
      if (!testCaseXml.includes('<testcase')) continue;
      
      const name = (testCaseXml.match(/name="([^"]*)"/) || [])[1] || '';
      const time = (testCaseXml.match(/time="([\d\.]+)"/) || [])[1] || 0;
      const failure = testCaseXml.includes('<failure');
      
      // Añadir caso de prueba al XML
      sonarXml += `    <testCase name="${name}" duration="${Math.round(parseFloat(time) * 1000)}">\n`;
      if (failure) {
        const failureMessage = (testCaseXml.match(/<failure[^>]*>(.*?)<\/failure>/s) || [])[1] || 'Test failed';
        sonarXml += `      <failure message="Test failed"><![CDATA[${failureMessage}]]></failure>\n`;
      }
      sonarXml += '    </testCase>\n';
    }
    
    sonarXml += '  </file>\n';
  }
  
  sonarXml += '</testExecutions>';
  
  // Escribir el archivo de salida
  console.log(`Escribiendo resultado en: ${sonarPath}`);
  fs.writeFileSync(sonarPath, sonarXml);
  console.log(`Converted JUnit report to SonarQube format. Output: ${sonarPath}`);
  
} catch (error) {
  console.error('Error converting JUnit report:', error);
  process.exit(1);
}
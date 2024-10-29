## Instrucciones para configurar la base de datos

1. Crea una base de datos en MySQL llamada `estebanquito`.
2. Importa el archivo `dump.sql` ejecutando:

   ```bash
   mysql -u root -p estebanquito < path/al/dump.sql

## Instruccion para configurar las variables de entorno
1. Crea un archivo llamado `.env`
2. Dentro del archivo configura las credenciales, así:
   ```javascript
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=estebanquito
   JWT_SECRET=<tu_secreto_seguro>

## Instruccion para correr el proyecto
1. Inicialice el archivo Node.js con Express haciendo:
   ```powershell
   npm run dev

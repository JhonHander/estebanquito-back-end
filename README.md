# Proyecto: Plataforma de Banca Estebanquito

## Instrucciones para configurar la base de datos

1. Crea una base de datos en MySQL llamada `estebanquito`.
2. Importa el archivo `dump.sql` ejecutando:
   
   ```bash
   mysql -u root -p estebanquito < path/al/dump.sql

(Si necesitas el archivo `dump.sql` me lo puedes pedir a mi correo: `jhmejia@correo.iue.edu.co`

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
1. Instale todas las librerias utilizadas en su local así:
   ```powershell
      npm install
2. Inicialice el archivo Node.js con Express haciendo:
   ```powershell
   npm run dev

## Sobre el proyecto
Para ver más detalles acerca del proyecto puedes ver [este repositorio](https://github.com/JhonHander/estebanquito-back-end).
Aqui encontrarás el MR (Modelo Relacional) y al descargar el proyecto te encontrarás en con el Backend de la app web Estebanquito. Encontrarás el uso de Hash Password, JWT y del lado de la base de datos un archivo dump.sql en el que se puede ver la arquitectura de las tablas y los datos. Además, los *Stored Procedures (Procedimiento Almacenado)* y los *Triggers (Desencadenadores)*.

![entidad-relacion-web (1)](https://github.com/user-attachments/assets/ab79dcdd-aeb3-4f96-909b-de14e17ee633)


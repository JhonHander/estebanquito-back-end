# Proyecto: Plataforma de Banca Estebanquito

## Descripción
Estebanquito es una plataforma de banca digital que permite a los usuarios realizar operaciones bancarias comunes como transferencias, depósitos, retiros, solicitud de préstamos y consultas de saldo e historial de transacciones.

## Tecnologías utilizadas
- **Backend**: Node.js con Express
- **Base de datos**: MySQL
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: Bcrypt para hash de contraseñas
- **Tareas programadas**: Node-cron para cálculo automático de intereses

## Instrucciones para configurar la base de datos

1. Crea una base de datos en MySQL llamada `estebanquito`.
2. Importa el archivo `dump.sql` ejecutando:
   
   ```bash
   mysql -u root -p estebanquito < path/al/dump.sql
   ```

Si necesitas el archivo `dump.sql` me lo puedes pedir a mi correo: `jhmejia@correo.iue.edu.co`

## Instrucciones para configurar las variables de entorno
1. Crea un archivo llamado `.env` en la raíz del proyecto
2. Dentro del archivo configura las credenciales, así:
   ```
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=estebanquito
   JWT_SECRET=<tu_secreto_seguro>
   ```

## Instrucciones para correr el proyecto
1. Instala todas las librerías utilizadas en tu entorno local:
   ```powershell
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```powershell
   npm run dev
   ```

## Estructura de la API

La API está estructurada en diferentes módulos que gestionan diversas funcionalidades bancarias.

### Endpoints de Autenticación

| Método | Endpoint | Descripción | Autenticación requerida |
|--------|----------|-------------|------------------------|
| POST | `/api/register` | Registro de nuevos usuarios | No |
| POST | `/api/login` | Inicio de sesión y obtención de token JWT | No |

### Endpoints de Usuario

| Método | Endpoint | Descripción | Autenticación requerida |
|--------|----------|-------------|------------------------|
| POST | `/api/getUserByAccountNumber` | Obtiene información del usuario por número de cuenta | Sí |
| PUT | `/api/updateUserByAccountNumber` | Actualiza información del perfil de usuario | Sí |

### Endpoints de Transacciones

| Método | Endpoint | Descripción | Autenticación requerida |
|--------|----------|-------------|------------------------|
| POST | `/api/getTransactionsByUser` | Obtiene el historial de transacciones del usuario | Sí |
| PUT | `/api/transferMoney` | Realiza una transferencia a otra cuenta | Sí |
| PUT | `/api/withdrawMoney` | Realiza un retiro de dinero | Sí |
| PUT | `/api/depositMoney` | Realiza un depósito de dinero | Sí |

### Endpoints de Préstamos

| Método | Endpoint | Descripción | Autenticación requerida |
|--------|----------|-------------|------------------------|
| POST | `/api/askForLoan` | Solicita un préstamo | Sí |

### Endpoints de Reportes

| Método | Endpoint | Descripción | Autenticación requerida |
|--------|----------|-------------|------------------------|
| POST | `/api/reportTotalIncome` | Obtiene el total de ingresos del usuario | Sí |
| POST | `/api/reportTotalOutcome` | Obtiene el total de egresos del usuario | Sí |
| POST | `/api/reportTotalDebts` | Obtiene el total de deudas del usuario | Sí |

## Detalles de los Endpoints

### Autenticación

#### Registro de usuario
```
POST /api/register
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "name": "Nombre Usuario",
  "email": "usuario@example.com",
  "password": "contraseña123",
  "type": "Cliente"
}
```
**Respuesta exitosa**:
```json
{
  "message": "Usuario registrado"
}
```

#### Inicio de sesión
```
POST /api/login
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "password": "contraseña123"
}
```
**Respuesta exitosa**:
```json
{
  "message": "Inicio exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Transacciones

#### Realizar una transferencia
```
PUT /api/transferMoney
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "destinationAccountNumber": "0987654321",
  "amount": 100.50
}
```
**Respuesta exitosa**:
```json
{
  "message": "Transferencia realizada"
}
```

#### Realizar un retiro
```
PUT /api/withdrawMoney
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "amount": 50.75
}
```
**Respuesta exitosa**:
```json
{
  "message": "Retiro realizado"
}
```

#### Realizar un depósito
```
PUT /api/depositMoney
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "amount": 200.00
}
```
**Respuesta exitosa**:
```json
{
  "message": "Deposito realizado"
}
```

### Préstamos

#### Solicitar un préstamo
```
POST /api/askForLoan
```
**Body**:
```json
{
  "accountNumber": "1234567890",
  "amount": 5000.00,
  "term": 12
}
```
**Respuesta exitosa**:
```json
{
  "message": "Préstamo solicitado"
}
```

## Características especiales

### Cálculo automático de intereses
El sistema cuenta con un mecanismo de cálculo automático de intereses para préstamos vencidos. Utiliza `node-cron` para ejecutar la función `recalculateInterest()` periódicamente, aplicando un 5% de interés por cada periodo de 15 días de vencimiento.

### Seguridad
- Todas las contraseñas se almacenan con hash utilizando bcrypt.
- La autenticación se realiza mediante tokens JWT con expiración de 1 hora.
- La mayoría de los endpoints requieren autenticación mediante el middleware `authMiddleware`.

### Transacciones de base de datos
Las operaciones críticas (transferencias, retiros, depósitos) utilizan transacciones SQL para garantizar la integridad de los datos incluso en caso de error.

## Modelo de datos

El sistema utiliza las siguientes tablas principales:

- **usuarios**: Almacena la información de los usuarios (número de cuenta, nombre, email, contraseña, tipo, saldo).
- **transacciones**: Registra todas las operaciones (transferencias, depósitos, retiros).
- **prestamos**: Almacena los préstamos solicitados por los usuarios.
- **reportes**: Mantiene un registro de ingresos, egresos y deudas de los usuarios.
- **historial_intereses**: Registra los intereses aplicados a préstamos vencidos.

## Sobre el proyecto
Para ver más detalles acerca del proyecto puedes ver [este repositorio](https://github.com/JhonHander/estebanquito-front-end).
Aquí encontrarás el MR (Modelo Relacional) y al descargar el proyecto te encontrarás con el Backend de la app web Estebanquito. Encontrarás el uso de Hash Password, JWT y del lado de la base de datos un archivo dump.sql en el que se puede ver la arquitectura de las tablas y los datos. Además, los *Stored Procedures (Procedimiento Almacenado)* y los *Triggers (Desencadenadores)*.

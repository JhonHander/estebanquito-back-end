// Importamos directamente - no usamos jest.mock al principio
import { jest } from '@jest/globals';
import { register, login, userExists } from '../../controllers/controller.auth.js';
import config from '../../config.js';

// Configuramos los mocks después de importar
const mockGetConnection = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();

// Mocks de los módulos
jest.unstable_mockModule('../../database/db.js', () => ({
  getConnection: mockGetConnection
}));

jest.unstable_mockModule('bcrypt', () => ({
  hash: mockHash,
  compare: mockCompare
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  sign: mockSign
}));

// Ahora podemos importar las versiones mockeadas (necesario porque estamos en ES Modules)
const { getConnection } = await import('../../database/db.js');
const bcrypt = await import('bcrypt');
const jwt = await import('jsonwebtoken');

describe('Auth Controller', () => {
  let mockRequest;
  let mockResponse;
  let mockConnection;

  beforeEach(() => {
    // Reset mocks antes de cada prueba
    jest.clearAllMocks();

    // Mock de la conexión a la base de datos
    mockConnection = {
      query: jest.fn(),
      release: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    mockGetConnection.mockResolvedValue(mockConnection); // Simula obtener una conexión

    // Mock de request y response de Express
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(), // Permite encadenar .status().json()
      json: jest.fn(),
    };
  });

  // --- Pruebas para la función register ---
  describe('register', () => {
    it('debería registrar un usuario exitosamente si no existe', async () => {
      // Configuración específica para esta prueba
      mockRequest.body = {
        accountNumber: '123456789',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        type: 'Cliente',
      };

      // Simular que userExists devuelve false (usuario no existe)
      // Nota: userExists usa getConnection internamente, así que mockeamos la query que hace
       mockConnection.query
          .mockResolvedValueOnce([[]]); // Primera llamada (userExists) devuelve array vacío

      // Simular que bcrypt.hash funciona
      mockHash.mockResolvedValue('hashedPassword123');

      // Simular que la inserción en la BD funciona
      mockConnection.query.mockResolvedValueOnce([{}]); // Segunda llamada (INSERT)

      // Ejecutar la función
      await register(mockRequest, mockResponse);

      // Verificaciones
      expect(getConnection).toHaveBeenCalledTimes(2); // Una para userExists, otra para el INSERT
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]);
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockConnection.query).toHaveBeenCalledWith(
          'INSERT INTO usuarios (numero_cuenta, nombre, email, contraseña, tipo, saldo) VALUES (?, ?, ?, ?, ?, ?)',
          ['123456789', 'Test User', 'test@example.com', 'hashedPassword123', 'Cliente', 0]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario registrado' });
      expect(mockConnection.release).toHaveBeenCalledTimes(2); // Se libera la conexión dos veces
    });

    it('debería devolver error 400 si el usuario ya existe', async () => {
      mockRequest.body = {
        accountNumber: '987654321',
        name: 'Test User',
        email: 'exist@example.com',
        password: 'password123',
        type: 'Cliente',
        password: 'password123',
      };

      // Simular que userExists devuelve true (usuario existe)
      mockConnection.query.mockResolvedValueOnce([[{ id: 1, numero_cuenta: '987654321' }]]); // userExists encuentra un usuario

      await register(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1); // Solo para userExists
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]);
      expect(mockHash).not.toHaveBeenCalled(); // No debería intentar hashear
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'El usuario ya existe' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 500 si falla el hash de la contraseña', async () => {
      mockRequest.body = {
        accountNumber: '111222333',
        password: 'password123',
        name: 'Hash User',
        email: 'hast@example.com',
        password: 'password1567',
        type: 'Cliente',
         // ... otros campos necesarios
      };

       // Simular que userExists devuelve false
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Simular que bcrypt.hash falla
      const hashError = new Error('Hashing failed');
      mockHash.mockRejectedValue(hashError);

      await register(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1); // Solo para userExists
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1); // Se libera en el finally de userExists
    });

     it('debería devolver error 500 si falla la inserción en la base de datos', async () => {
      mockRequest.body = {
        accountNumber: '444555666',
        name: 'Fail User',
        email: 'fail@example.com',
        password: 'password123',
        type: 'Cliente',
      };

      // Simular que userExists devuelve false
      mockConnection.query.mockResolvedValueOnce([[]]);
      // Simular hash exitoso
      mockHash.mockResolvedValue('hashedPasswordFail');
      // Simular que la query INSERT falla
      const dbError = new Error('DB insert failed');
      mockConnection.query.mockRejectedValueOnce(dbError); // La segunda query (INSERT) falla

      await register(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(2);
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockConnection.query).toHaveBeenCalledWith( // Verifica la llamada a INSERT
          'INSERT INTO usuarios (numero_cuenta, nombre, email, contraseña, tipo, saldo) VALUES (?, ?, ?, ?, ?, ?)',
          expect.any(Array)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockConnection.release).toHaveBeenCalledTimes(2); // Se libera en userExists y en el finally del INSERT
    });
  });

  // --- Pruebas para la función login ---
  describe('login', () => {
    it('debería iniciar sesión y devolver un token si las credenciales son correctas', async () => {
      mockRequest.body = {
        accountNumber: '123456789',
        password: 'password123',
      };
      const mockUser = {
        id: 1,
        numero_cuenta: '123456789',
        nombre: 'Login User',
        email: 'login@example.com',
        contraseña: 'hashedPasswordCorrect',
        tipo: 'Cliente'
      };
      const mockToken = 'mockJwtToken';

      // Simular que se encuentra el usuario
      mockConnection.query.mockResolvedValueOnce([[mockUser]]);

      // Simular que bcrypt.compare devuelve true
      mockCompare.mockResolvedValue(true);
      // Simular que jwt.sign funciona
      mockSign.mockReturnValue(mockToken);

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', mockRequest.body.accountNumber);
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect');
      expect(mockSign).toHaveBeenCalledWith(
          { numero_cuenta: mockUser.numero_cuenta },
          config.jwtSecret,
          { expiresIn: '1h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Inicio exitoso', token: mockToken });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 404 si el usuario no se encuentra', async () => {
      mockRequest.body = {
        accountNumber: 'nonexistent',
        password: 'password123',
      };

      // Simular que no se encuentra el usuario
      mockConnection.query.mockResolvedValueOnce([[]]);

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', 'nonexistent');
      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 401 si la contraseña es incorrecta', async () => {
         mockRequest.body = {
        accountNumber: '123456789',
        password: 'wrongPassword',
      };
      const mockUser = {
        id: 1,
        numero_cuenta: '123456789',
        contraseña: 'hashedPasswordCorrect',
      };

      // Simular que se encuentra el usuario
      mockConnection.query.mockResolvedValueOnce([[mockUser]]);
      // Simular que bcrypt.compare devuelve false
      mockCompare.mockResolvedValue(false);

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', '123456789');
      expect(mockCompare).toHaveBeenCalledWith('wrongPassword', 'hashedPasswordCorrect');
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Contraseña incorrecta' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

     it('debería devolver error 500 si falla la consulta a la base de datos', async () => {
      mockRequest.body = {
        accountNumber: 'anyAccount',
        password: 'anyPassword',
      };
      const dbError = new Error('DB query failed');

      // Simular que la query falla
      mockConnection.query.mockRejectedValue(dbError);

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', 'anyAccount');
      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1); // Se llama en el finally
    });

     it('debería devolver error 500 si falla bcrypt.compare', async () => {
      mockRequest.body = {
        accountNumber: '123456789',
        password: 'password123',
      };
       const mockUser = {
        id: 1,
        numero_cuenta: '123456789',
        contraseña: 'hashedPasswordCorrect',
      };
      const compareError = new Error('Compare failed');

      // Simular que se encuentra el usuario
      mockConnection.query.mockResolvedValueOnce([[mockUser]]);
      // Simular que bcrypt.compare falla
      mockCompare.mockRejectedValue(compareError);

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect');
      expect(jwt.sign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

     it('debería devolver error 500 si falla jwt.sign', async () => {
      mockRequest.body = {
        accountNumber: '123456789',
        password: 'password123',
      };
       const mockUser = {
        id: 1,
        numero_cuenta: '123456789',
        contraseña: 'hashedPasswordCorrect',
      };
      const signError = new Error('JWT sign failed');

      // Simular que se encuentra el usuario y la contraseña es válida
      mockConnection.query.mockResolvedValueOnce([[mockUser]]);
      mockCompare.mockResolvedValue(true);
      // Simular que jwt.sign falla
      mockSign.mockImplementation(() => { throw signError; });

      await login(mockRequest, mockResponse);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', '123456789');
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect');
      expect(mockSign).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });
  });

  // --- Pruebas para la función userExists ---
  // (Aunque userExists se prueba indirectamente en register,
  // podríamos añadir pruebas explícitas si fuera más compleja o exportada para otros usos)
  describe('userExists', () => {
    it('debería devolver true si el usuario existe', async () => {
      const accountNumber = 'existingUser';
      // Simular que la query encuentra un usuario
      mockConnection.query.mockResolvedValueOnce([[{ id: 1 }]]);

      const exists = await userExists(accountNumber);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(exists).toBe(true);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('debería devolver false si el usuario no existe', async () => {
      const accountNumber = 'nonExistingUser';
      // Simular que la query no encuentra nada
      mockConnection.query.mockResolvedValueOnce([[]]);

      const exists = await userExists(accountNumber);

      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(exists).toBe(false);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de base de datos y liberar la conexión', async () => {
         const accountNumber = 'errorUser';
         const dbError = new Error('DB error');
         mockConnection.query.mockRejectedValue(dbError);
         // Espiar console.error para verificar que se llama
         const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

         // Como la función original no devuelve el error, solo lo loguea,
         // esperamos undefined (o lo que devuelva en caso de error, que es nada)
         await expect(userExists(accountNumber)).resolves.toBeUndefined();


         expect(getConnection).toHaveBeenCalledTimes(1);
         expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
         expect(consoleSpy).toHaveBeenCalledWith(dbError);
         expect(mockConnection.release).toHaveBeenCalledTimes(1); // Asegura que se libera incluso con error

         consoleSpy.mockRestore(); // Limpia el spy
    });
  });
});
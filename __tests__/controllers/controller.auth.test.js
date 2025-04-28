// Importamos solo lo necesario al principio
import { jest } from '@jest/globals';
import config from '../../config.js';

// Mocks de las funciones que serán usadas por los módulos mockeados
const mockGetConnection = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();
const mockQuery = jest.fn();
const mockRelease = jest.fn();

// Mocks de los módulos ANTES de cualquier import del código bajo prueba
jest.unstable_mockModule('../../database/db.js', () => ({
  getConnection: mockGetConnection.mockResolvedValue({ // Devolvemos el mock de conexión directamente aquí
    query: mockQuery,
    release: mockRelease,
    // Añade otros métodos si son necesarios (beginTransaction, commit, rollback)
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  })
}));

jest.unstable_mockModule('bcrypt', () => ({
  hash: mockHash,
  compare: mockCompare
}));

// Actualizar el mock de jsonwebtoken para incluir default.sign
jest.unstable_mockModule('jsonwebtoken', () => ({
  sign: mockSign,
  default: {
    sign: mockSign
  }
}));

// Importamos el controlador DESPUÉS de configurar los mocks
const { register, login, userExists } = await import('../../controllers/controller.auth.js');
// Ya no necesitamos importar las dependencias mockeadas aquí, se resuelven internamente

describe('Auth Controller', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks antes de cada prueba
    jest.clearAllMocks();
    // Reseteamos las implementaciones específicas de query si es necesario
    // (Aunque jest.clearAllMocks() debería resetear las llamadas,
    // a veces es bueno resetear las implementaciones por defecto si las cambias mucho)
    mockQuery.mockReset();
    mockHash.mockReset();
    mockCompare.mockReset();
    mockSign.mockReset();
    mockRelease.mockReset();
    mockGetConnection.mockClear(); // Asegura que el contador de llamadas a getConnection se reinicie


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
      // ... (el resto de la configuración de la prueba) ...
      mockRequest.body = {
        accountNumber: '123456789',
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        type: 'Cliente',
      };

      // Simular que userExists devuelve false (la query no encuentra filas)
      mockQuery.mockResolvedValueOnce([[]]); // Primera llamada (userExists)

      // Simular que bcrypt.hash funciona
      mockHash.mockResolvedValue('hashedPassword123');

      // Simular que la inserción en la BD funciona (la query no devuelve nada significativo)
      // La segunda llamada a query (INSERT) dentro de la función 'querys' auxiliar
      mockQuery.mockResolvedValueOnce([{}]); // Segunda llamada (INSERT)

      // Ejecutar la función
      await register(mockRequest, mockResponse);

      // Verificaciones
      // IMPORTANTE: userExists y querys llaman a getConnection y release internamente
      expect(mockGetConnection).toHaveBeenCalledTimes(2); // Una para userExists, otra para el INSERT vía querys
      expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]);
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockQuery).toHaveBeenNthCalledWith(2,
          'INSERT INTO usuarios (numero_cuenta, nombre, email, contraseña, tipo, saldo) VALUES (?, ?, ?, ?, ?, ?)',
          ['123456789', 'Test User', 'test@example.com', 'hashedPassword123', 'Cliente', 0]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario registrado' });
      expect(mockRelease).toHaveBeenCalledTimes(2); // Se libera la conexión dos veces
    });

    it('debería devolver error 400 si el usuario ya existe', async () => {
      // ... (configuración) ...
      mockRequest.body = {
        accountNumber: '987654321',
        name: 'Test User',
        email: 'exist@example.com',
        password: 'password123',
        type: 'Cliente',
      };

      // Simular que userExists devuelve true (la query encuentra una fila)
      mockQuery.mockResolvedValueOnce([[{ id: 1, numero_cuenta: '987654321' }]]); // userExists

      await register(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1); // Solo para userExists
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]);
      expect(mockHash).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: `El usuario ya existe` }); // Ajustado mensaje
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 500 si falla el hash de la contraseña', async () => {
      // ... (configuración) ...
       mockRequest.body = {
        accountNumber: '111222333',
        password: 'password123', // Asegúrate que sea la contraseña correcta a hashear
        name: 'Hash User',
        email: 'hast@example.com', // Corregido typo
        type: 'Cliente',
      };

       // Simular que userExists devuelve false
      mockQuery.mockResolvedValueOnce([[]]); // userExists

      // Simular que bcrypt.hash falla
      const hashError = new Error('Hashing failed');
      mockHash.mockRejectedValue(hashError);

      await register(mockRequest, mockResponse);

      // userExists llama a getConnection 1 vez. El try principal no llama a getConnection directamente.
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]); // Verifica la query de userExists
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1); // Solo se libera en el finally de userExists
    });

     it('debería devolver error 500 si falla la inserción en la base de datos', async () => {
      // ... (configuración) ...
      mockRequest.body = {
        accountNumber: '444555666',
        name: 'Fail User',
        email: 'fail@example.com',
        password: 'password123',
        type: 'Cliente',
      };

      // Simular que userExists devuelve false
      mockQuery.mockResolvedValueOnce([[]]); // userExists
      // Simular hash exitoso
      mockHash.mockResolvedValue('hashedPasswordFail');
      // Simular que la query INSERT falla (dentro de la función 'querys')
      const dbError = new Error('DB insert failed');
      mockQuery.mockRejectedValueOnce(dbError); // La segunda query (INSERT) falla

      await register(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(2); // userExists y querys(INSERT)
      expect(mockQuery).toHaveBeenNthCalledWith(1, 'SELECT * FROM usuarios WHERE numero_cuenta = ?', [mockRequest.body.accountNumber]); // userExists
      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(mockQuery).toHaveBeenNthCalledWith(2, // Verifica la llamada a INSERT
          'INSERT INTO usuarios (numero_cuenta, nombre, email, contraseña, tipo, saldo) VALUES (?, ?, ?, ?, ?, ?)',
          expect.any(Array)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(2); // Se libera en userExists y en el finally de querys(INSERT)
    });
  });

  // --- Pruebas para la función login ---
  describe('login', () => {
    it('debería iniciar sesión y devolver un token si las credenciales son correctas', async () => {
      // ... (configuración) ...
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
      mockQuery.mockResolvedValueOnce([[mockUser]]); // SELECT *

      // Simular que bcrypt.compare devuelve true
      mockCompare.mockResolvedValue(true);
      // Simular que jwt.sign funciona
      mockSign.mockReturnValue(mockToken);

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1); // Solo una llamada directa en login
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', mockRequest.body.accountNumber);
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect');
      expect(mockSign).toHaveBeenCalledWith(
          { numero_cuenta: mockUser.numero_cuenta },
          config.jwtSecret,
          { expiresIn: '1h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Inicio exitoso', token: mockToken });
      expect(mockRelease).toHaveBeenCalledTimes(1); // Se libera en el finally de login
    });

    it('debería devolver error 404 si el usuario no se encuentra', async () => {
      // ... (configuración) ...
      mockRequest.body = {
        accountNumber: 'nonexistent',
        password: 'password123',
      };

      // Simular que no se encuentra el usuario
      mockQuery.mockResolvedValueOnce([[]]); // SELECT * devuelve vacío

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', 'nonexistent');
      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 401 si la contraseña es incorrecta', async () => {
      // ... (configuración) ...
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
      mockQuery.mockResolvedValueOnce([[mockUser]]);
      // Simular que bcrypt.compare devuelve false
      mockCompare.mockResolvedValue(false);

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', '123456789');
      expect(mockCompare).toHaveBeenCalledWith('wrongPassword', 'hashedPasswordCorrect');
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Contraseña incorrecta' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

     it('debería devolver error 500 si falla la consulta a la base de datos', async () => {
      // ... (configuración) ...
      mockRequest.body = {
        accountNumber: 'anyAccount',
        password: 'anyPassword',
      };
      const dbError = new Error('DB query failed');

      // Simular que la query falla
      mockQuery.mockRejectedValue(dbError);

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', 'anyAccount');
      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1); // Se llama en el finally
    });

     it('debería devolver error 500 si falla bcrypt.compare', async () => {
      // ... (configuración) ...
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
      mockQuery.mockResolvedValueOnce([[mockUser]]);
      // Simular que bcrypt.compare falla
      mockCompare.mockRejectedValue(compareError);

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', '123456789'); // Verifica query
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect'); // Verifica compare
      expect(mockSign).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

     it('debería devolver error 500 si falla jwt.sign', async () => {
      // ... (configuración) ...
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
      mockQuery.mockResolvedValueOnce([[mockUser]]);
      mockCompare.mockResolvedValue(true);
      // Simular que jwt.sign falla
      mockSign.mockImplementation(() => { throw signError; });

      await login(mockRequest, mockResponse);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', '123456789');
      expect(mockCompare).toHaveBeenCalledWith('password123', 'hashedPasswordCorrect');
      expect(mockSign).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });
  });

  // --- Pruebas para la función userExists ---
  describe('userExists', () => {
    it('debería devolver true si el usuario existe', async () => {
      const accountNumber = 'existingUser';
      // Simular que la query encuentra un usuario
      mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);

      const exists = await userExists(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(exists).toBe(true);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver false si el usuario no existe', async () => {
      const accountNumber = 'nonExistingUser';
      // Simular que la query no encuentra nada
      mockQuery.mockResolvedValueOnce([[]]);

      const exists = await userExists(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(exists).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de base de datos, loguear y liberar la conexión', async () => { // Ajustada descripción
         const accountNumber = 'errorUser';
         const dbError = new Error('DB error');
         mockQuery.mockRejectedValue(dbError); // Simular fallo en query
         // Espiar console.error para verificar que se llama
         const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

         // userExists ahora debería devolver undefined implícitamente en caso de error
         const result = await userExists(accountNumber);


         expect(mockGetConnection).toHaveBeenCalledTimes(1);
         expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
         expect(consoleSpy).toHaveBeenCalledWith(dbError);
         expect(mockRelease).toHaveBeenCalledTimes(1); // Asegura que se libera incluso con error
         expect(result).toBeUndefined(); // Verifica que devuelve undefined

         consoleSpy.mockRestore(); // Limpia el spy
    });
  });
});
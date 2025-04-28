// Importamos solo lo necesario al principio
import { jest } from '@jest/globals';

// Mocks de las funciones que serán usadas por los módulos mockeados
const mockGetConnection = jest.fn();
const mockQuery = jest.fn();
const mockRelease = jest.fn();

// Mocks de los módulos ANTES de cualquier import del código bajo prueba
jest.unstable_mockModule('../../database/db.js', () => ({
  getConnection: mockGetConnection.mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  })
}));

// Importamos el controlador DESPUÉS de configurar los mocks
const { 
  getUserByAccountNumber, 
  updateUserByAccountNumber 
} = await import('../../controllers/controller.user.js');

describe('User Controller', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset de todos los mocks antes de cada prueba
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockGetConnection.mockClear();

    // Mock de request y response de Express
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Pruebas para la función getUserByAccountNumber ---
  describe('getUserByAccountNumber', () => {
    it('debería devolver la información del usuario si existe', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const mockUser = {
        id: 1,
        numero_cuenta: accountNumber,
        nombre: 'Test User',
        email: 'test@example.com',
        tipo: 'Cliente',
        saldo: 1000
      };
      
      // Simulamos que se encuentra el usuario
      mockQuery.mockResolvedValueOnce([[mockUser]]);

      // Ejecución
      await getUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE numero_cuenta = ?', 
        accountNumber
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver error 404 si el usuario no existe', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      
      // Simulamos que no se encuentra el usuario
      mockQuery.mockResolvedValueOnce([[]]);

      // Ejecución
      await getUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE numero_cuenta = ?', 
        accountNumber
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar el caso de datos inconsistentes', async () => {
      // Configuración - simulamos un caso donde existe una fila pero no coincide el número de cuenta
      const accountNumber = '123456789';
      const wrongAccountNumber = '987654321';
      mockRequest.body = { accountNumber };
      const mockUser = {
        id: 1,
        numero_cuenta: wrongAccountNumber, // Número de cuenta diferente al solicitado
        nombre: 'Wrong User',
        email: 'wrong@example.com'
      };
      
      // Simulamos una respuesta inconsistente
      mockQuery.mockResolvedValueOnce([[mockUser]]);

      // Ejecución
      await getUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE numero_cuenta = ?', 
        accountNumber
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const dbError = new Error('DB error');
      
      // Simulamos que la consulta falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ejecución
      await getUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM usuarios WHERE numero_cuenta = ?', 
        accountNumber
      );
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función updateUserByAccountNumber ---
  describe('updateUserByAccountNumber', () => {
    it('debería actualizar el perfil de usuario exitosamente', async () => {
      // Configuración
      const accountNumber = '123456789';
      const name = 'Updated User';
      const email = 'updated@example.com';
      mockRequest.body = { accountNumber, name, email };
      
      // Simulamos que la actualización funciona
      mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Ejecución
      await updateUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE numero_cuenta = ?', 
        [name, email, accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Perfil actualizado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';
      const name = 'Updated User';
      const email = 'updated@example.com';
      mockRequest.body = { accountNumber, name, email };
      const dbError = new Error('DB error');
      
      // Simulamos que la actualización falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ejecución
      await updateUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE numero_cuenta = ?', 
        [name, email, accountNumber]
      );
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    it('debería actualizar correctamente incluso si no afecta filas (usuario existe pero no cambian los datos)', async () => {
      // Configuración
      const accountNumber = '123456789';
      const name = 'Same User';
      const email = 'same@example.com';
      mockRequest.body = { accountNumber, name, email };
      
      // Simulamos que la actualización no afecta filas (porque los datos son los mismos)
      mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

      // Ejecución
      await updateUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE numero_cuenta = ?', 
        [name, email, accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Perfil actualizado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar datos faltantes en la solicitud', async () => {
      // Configuración - simulamos una solicitud con datos incompletos
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber }; // Falta name y email
      
      // Ejecución
      await updateUserByAccountNumber(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      // La función actual no valida los datos, así que ejecutará la query con undefined
      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, email = ? WHERE numero_cuenta = ?', 
        [undefined, undefined, accountNumber]
      );
      // La implementación actual no maneja este caso especial, simplemente intenta actualizar con undefined
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });
  });
});
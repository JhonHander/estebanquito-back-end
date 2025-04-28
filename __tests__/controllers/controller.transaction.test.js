// Importamos solo lo necesario al principio
import { jest } from '@jest/globals';

// Mocks de las funciones que serán usadas por los módulos mockeados
const mockGetConnection = jest.fn();
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockBeginTransaction = jest.fn();
const mockCommit = jest.fn();
const mockRollback = jest.fn();

// Mock de userExists (del controller.auth)
const mockUserExists = jest.fn();

// Configuración del mock para getConnection que devuelve un objeto con todas las funciones necesarias
mockGetConnection.mockResolvedValue({
  query: mockQuery,
  release: mockRelease,
  beginTransaction: mockBeginTransaction,
  commit: mockCommit,
  rollback: mockRollback,
});

// Mocks de los módulos ANTES de cualquier import del código bajo prueba
jest.unstable_mockModule('../../database/db.js', () => ({
  getConnection: mockGetConnection
}));

// Mock del controller.auth para la función userExists
jest.unstable_mockModule('../../controllers/controller.auth.js', () => ({
  userExists: mockUserExists
}));

// Importamos el controlador DESPUÉS de configurar los mocks
const { 
  getTransactionsByUser, 
  transfer, 
  withdrawMoney, 
  depositMoney, 
  enoughBalance 
} = await import('../../controllers/controller.transaction.js');

describe('Transaction Controller', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset de todos los mocks antes de cada prueba
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockBeginTransaction.mockReset();
    mockCommit.mockReset();
    mockRollback.mockReset();
    mockUserExists.mockReset();
    
    // Mock de request y response de Express
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Pruebas para la función getTransactionsByUser ---
  describe('getTransactionsByUser', () => {
    it('debería devolver las transacciones del usuario si existen', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
      };
      
      const mockTransactions = [
        { id: 1, cuenta_principal_id: '123456789', tipo: 'Deposito', monto: 100 },
        { id: 2, cuenta_principal_id: '123456789', tipo: 'Retiro', monto: 50 }
      ];
      
      // Simulamos que la consulta encuentra transacciones
      mockQuery.mockResolvedValueOnce([mockTransactions]);

      // Ejecutar la función
      await getTransactionsByUser(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM transacciones WHERE cuenta_principal_id = ?', '123456789');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver un mensaje de error si no se encuentran transacciones', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '987654321',
      };
      
      // Simulamos que la consulta no encuentra transacciones
      mockQuery.mockResolvedValueOnce([[]]);

      // Ejecutar la función
      await getTransactionsByUser(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM transacciones WHERE cuenta_principal_id = ?', '987654321');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Transacción no encontrada' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de la base de datos', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
      };
      
      // Simulamos un error en la consulta
      const dbError = new Error('Error en la base de datos');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecutar la función
      await getTransactionsByUser(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM transacciones WHERE cuenta_principal_id = ?', '123456789');
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función enoughBalance ---
  describe('enoughBalance', () => {
    it('debería devolver true si el usuario tiene saldo suficiente', async () => {
      // Configuración
      const accountNumber = '123456789';
      const amount = 100;
      
      // Mock de la consulta para obtener el saldo
      mockQuery.mockResolvedValueOnce([[{ saldo: 200 }]]);
      
      // Mock de userExists para que devuelva true
      mockUserExists.mockResolvedValueOnce(true);

      // Ejecutar la función
      const result = await enoughBalance(accountNumber, amount);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(mockUserExists).toHaveBeenCalledWith(accountNumber);
      expect(result).toBe(true);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver false si el usuario no tiene saldo suficiente', async () => {
      // Configuración
      const accountNumber = '123456789';
      const amount = 300;
      
      // Mock de la consulta para obtener el saldo
      mockQuery.mockResolvedValueOnce([[{ saldo: 200 }]]);
      
      // Mock de userExists para que devuelva true
      mockUserExists.mockResolvedValueOnce(true);

      // Ejecutar la función
      const result = await enoughBalance(accountNumber, amount);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(mockUserExists).toHaveBeenCalledWith(accountNumber);
      expect(result).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver false si el usuario no existe', async () => {
      // Configuración
      const accountNumber = '999999999';
      const amount = 100;
      
      // Mock de la consulta para indicar que no existe el usuario
      mockQuery.mockResolvedValueOnce([[]]);

      // Ejecutar la función
      const result = await enoughBalance(accountNumber, amount);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(result).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores y devolver false', async () => {
      // Configuración
      const accountNumber = '123456789';
      const amount = 100;
      
      // Simulamos un error en la consulta
      const dbError = new Error('Error en la base de datos');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecutar la función
      const result = await enoughBalance(accountNumber, amount);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
      expect(consoleSpy).toHaveBeenCalledWith("Error al verificar el saldo:", dbError);
      expect(result).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función transfer ---
  describe('transfer', () => {
    it('debería realizar una transferencia exitosa', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        destinationAccountNumber: '987654321',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva true (la cuenta destino existe)
      mockUserExists.mockResolvedValueOnce(true);
      
      // Mock de enoughBalance para que devuelva true (hay saldo suficiente)
      // Creamos un spy para enoughBalance ya que es una función interna del módulo
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(true);
      
      // Ejecutar la función
      await transfer(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('987654321');
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 100);
      
      // Verificar las actualizaciones de saldo
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
        [100, '123456789']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        'UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?',
        [100, '987654321']
      );
      
      // Verificar la inserción de la transacción
      expect(mockQuery).toHaveBeenNthCalledWith(3, 
        'INSERT INTO transacciones (cuenta_principal_id, cuenta_destino_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)',
        ['123456789', '987654321', 'Transferencia', 100, expect.any(Date)]
      );
      
      expect(mockCommit).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Transferencia realizada' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      enoughBalanceSpy.mockRestore();
    });

    it('debería fallar si la cuenta destino no existe', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        destinationAccountNumber: '000000000',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva false (la cuenta destino no existe)
      mockUserExists.mockResolvedValueOnce(false);
      
      // Ejecutar la función
      await transfer(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('000000000');
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Cuenta de destino no encontrada' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería fallar si no hay saldo suficiente', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        destinationAccountNumber: '987654321',
        amount: 1000,
      };
      
      // Mock de userExists para que devuelva true (la cuenta destino existe)
      mockUserExists.mockResolvedValueOnce(true);
      
      // Mock de enoughBalance para que devuelva false (no hay saldo suficiente)
      // Creamos un spy para enoughBalance ya que es una función interna del módulo
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(false);
      
      // Ejecutar la función
      await transfer(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('987654321');
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 1000);
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Saldo insuficiente' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      enoughBalanceSpy.mockRestore();
    });

    it('debería manejar errores durante la transferencia', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        destinationAccountNumber: '987654321',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva true (la cuenta destino existe)
      mockUserExists.mockResolvedValueOnce(true);
      
      // Mock de enoughBalance para que devuelva true (hay saldo suficiente)
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(true);
      
      // Simulamos un error en la primera actualización
      const dbError = new Error('Error en la base de datos');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecutar la función
      await transfer(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('987654321');
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 100);
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar los spies
      enoughBalanceSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función withdrawMoney ---
  describe('withdrawMoney', () => {
    it('debería realizar un retiro exitoso', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        amount: 100,
      };
      
      // Mock de enoughBalance para que devuelva true (hay saldo suficiente)
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(true);
      
      // Ejecutar la función
      await withdrawMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 100);
      
      // Verificar la actualización del saldo
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
        [100, '123456789']
      );
      
      // Verificar la inserción de la transacción
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        'INSERT INTO transacciones (cuenta_principal_id, cuenta_destino_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)',
        ['123456789', null, 'Retiro', 100, expect.any(Date)]
      );
      
      expect(mockCommit).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Retiro realizado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      enoughBalanceSpy.mockRestore();
    });

    it('debería fallar si no hay saldo suficiente', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        amount: 1000,
      };
      
      // Mock de enoughBalance para que devuelva false (no hay saldo suficiente)
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(false);
      
      // Ejecutar la función
      await withdrawMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 1000);
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Saldo insuficiente' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      enoughBalanceSpy.mockRestore();
    });

    it('debería manejar errores durante el retiro', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        amount: 100,
      };
      
      // Mock de enoughBalance para que devuelva true (hay saldo suficiente)
      const enoughBalanceSpy = jest.spyOn({ enoughBalance }, 'enoughBalance').mockResolvedValueOnce(true);
      
      // Simulamos un error en la actualización
      const dbError = new Error('Error en la base de datos');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecutar la función
      await withdrawMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(enoughBalanceSpy).toHaveBeenCalledWith('123456789', 100);
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar los spies
      enoughBalanceSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función depositMoney ---
  describe('depositMoney', () => {
    it('debería realizar un depósito exitoso', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva true (la cuenta existe)
      mockUserExists.mockResolvedValueOnce(true);
      
      // Ejecutar la función
      await depositMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('123456789');
      
      // Verificar la inserción de la transacción
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'INSERT INTO transacciones (cuenta_principal_id, cuenta_destino_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)',
        ['123456789', null, 'Deposito', 100, expect.any(Date)]
      );
      
      // Verificar la actualización del saldo
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        'UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?',
        [100, '123456789']
      );
      
      expect(mockCommit).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Deposito realizado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería fallar si la cuenta no existe', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '000000000',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva false (la cuenta no existe)
      mockUserExists.mockResolvedValueOnce(false);
      
      // Ejecutar la función
      await depositMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('000000000');
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Cuenta no encontrada' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores durante el depósito', async () => {
      // Configuración
      mockRequest.body = {
        accountNumber: '123456789',
        amount: 100,
      };
      
      // Mock de userExists para que devuelva true (la cuenta existe)
      mockUserExists.mockResolvedValueOnce(true);
      
      // Simulamos un error en la inserción
      const dbError = new Error('Error en la base de datos');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecutar la función
      await depositMoney(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockBeginTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserExists).toHaveBeenCalledWith('123456789');
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar el spy
      consoleSpy.mockRestore();
    });
  });
});
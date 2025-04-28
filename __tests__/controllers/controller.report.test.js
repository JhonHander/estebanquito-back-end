// Importamos solo lo necesario al principio
import { jest } from '@jest/globals';

// Mocks de las funciones que serán usadas por los módulos mockeados
const mockGetConnection = jest.fn();
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockBeginTransaction = jest.fn();
const mockCommit = jest.fn();
const mockRollback = jest.fn();

// Mocks de los módulos ANTES de cualquier import del código bajo prueba
jest.unstable_mockModule('../../database/db.js', () => ({
  getConnection: mockGetConnection.mockResolvedValue({
    query: mockQuery,
    release: mockRelease,
    beginTransaction: mockBeginTransaction,
    commit: mockCommit,
    rollback: mockRollback,
  })
}));

// Importamos el controlador DESPUÉS de configurar los mocks
const { 
  showTotalIncome, 
  showTotalOutcome, 
  showTotalDebts, 
  calculateTotalIncome, 
  calculateTotalOutcome 
} = await import('../../controllers/controller.report.js');

describe('Report Controller', () => {
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    // Reset mocks antes de cada prueba
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

  // --- Pruebas para la función showTotalIncome ---
  describe('showTotalIncome', () => {
    it('debería devolver el ingreso total correctamente', async () => {
      // Configuración de la prueba
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const mockIncome = 5000.50;

      // Simulamos que la consulta encuentra el ingreso
      mockQuery.mockResolvedValueOnce([[{ income: mockIncome.toString() }]]);

      // Ejecutamos la función
      await showTotalIncome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_ingresos AS income FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalIncome: mockIncome });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver 0 si no hay ingresos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };

      // Simulamos que la consulta encuentra la cuenta pero sin ingresos
      mockQuery.mockResolvedValueOnce([[{ income: null }]]);

      // Ejecución
      await showTotalIncome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_ingresos AS income FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalIncome: 0 });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de la base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const dbError = new Error('Error en la consulta');

      // Simulamos que la consulta falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecución
      await showTotalIncome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_ingresos AS income FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(consoleSpy).toHaveBeenCalledWith('Error al obtener el ingreso total:', dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error al obtener el ingreso total' });
      expect(mockRelease).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función showTotalOutcome ---
  describe('showTotalOutcome', () => {
    it('debería devolver el egreso total correctamente', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const mockOutcome = 3000.25;

      // Simulamos que la consulta encuentra el egreso
      mockQuery.mockResolvedValueOnce([[{ outcome: mockOutcome.toString() }]]);

      // Ejecución
      await showTotalOutcome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_egresos AS outcome FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalOutcome: mockOutcome });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver 0 si no hay egresos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };

      // Simulamos que la consulta encuentra la cuenta pero sin egresos
      mockQuery.mockResolvedValueOnce([[{ outcome: null }]]);

      // Ejecución
      await showTotalOutcome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_egresos AS outcome FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalOutcome: 0 });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de la base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const dbError = new Error('Error en la consulta');

      // Simulamos que la consulta falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecución
      await showTotalOutcome(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT historico_egresos AS outcome FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(consoleSpy).toHaveBeenCalledWith('Error al obtener el egreso total:', dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error al obtener el egreso total' });
      expect(mockRelease).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función showTotalDebts ---
  describe('showTotalDebts', () => {
    it('debería devolver la deuda total correctamente', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const mockDebts = 10000.75;

      // Simulamos que la consulta encuentra las deudas
      mockQuery.mockResolvedValueOnce([[{ debts: mockDebts.toString() }]]);

      // Ejecución
      await showTotalDebts(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT deudas AS debts FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalDebts: mockDebts });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver 0 si no hay deudas', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };

      // Simulamos que la consulta encuentra la cuenta pero sin deudas
      mockQuery.mockResolvedValueOnce([[{ debts: null }]]);

      // Ejecución
      await showTotalDebts(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT deudas AS debts FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ totalDebts: 0 });
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores de la base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber };
      const dbError = new Error('Error en la consulta');

      // Simulamos que la consulta falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecución
      await showTotalDebts(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT deudas AS debts FROM reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(consoleSpy).toHaveBeenCalledWith('Error al obtener la deuda total:', dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error al obtener la deuda total' });
      expect(mockRelease).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función calculateTotalIncome ---
  describe('calculateTotalIncome', () => {
    it('debería calcular correctamente el ingreso total sumando todas las fuentes', async () => {
      // Configuración
      const accountNumber = '123456789';
      const mockTransfers = 1000.50;
      const mockDeposits = 2000.25;
      const mockLoans = 3000.75;
      const expectedTotal = mockTransfers + mockDeposits + mockLoans;

      // Simulamos las tres consultas requeridas
      mockQuery.mockResolvedValueOnce([[{ totalTransfers: mockTransfers.toString() }]]);
      mockQuery.mockResolvedValueOnce([[{ totalDeposits: mockDeposits.toString() }]]);
      mockQuery.mockResolvedValueOnce([[{ totalLoans: mockLoans.toString() }]]);

      // Ejecución
      const result = await calculateTotalIncome(accountNumber);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT SUM(monto) AS totalTransfers'), [accountNumber]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT SUM(monto) AS totalDeposits'), [accountNumber]);
      expect(mockQuery).toHaveBeenNthCalledWith(3, expect.stringContaining('SELECT SUM(monto) AS totalLoans'), [accountNumber]);
      expect(result).toBe(expectedTotal);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar valores nulos de la base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';

      // Simulamos consultas que devuelven valores nulos
      mockQuery.mockResolvedValueOnce([[{ totalTransfers: null }]]);
      mockQuery.mockResolvedValueOnce([[{ totalDeposits: null }]]);
      mockQuery.mockResolvedValueOnce([[{ totalLoans: null }]]);

      // Ejecución
      const result = await calculateTotalIncome(accountNumber);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(result).toBe(0); // Debe ser 0 si todas las sumas son null
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería propagar un error si falla alguna consulta', async () => {
      // Configuración
      const accountNumber = '123456789';
      const dbError = new Error('Error en la consulta');

      // Simulamos que falla la primera consulta
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecución y verificación de excepción propagada
      await expect(calculateTotalIncome(accountNumber)).rejects.toThrow(dbError);

      // Otras verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error al calcular el ingreso total:', dbError);
      expect(mockRelease).toHaveBeenCalledTimes(1); // Asegura que se libera incluso con error

      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función calculateTotalOutcome ---
  describe('calculateTotalOutcome', () => {
    it('debería calcular correctamente el egreso total sumando transferencias y retiros', async () => {
      // Configuración
      const accountNumber = '123456789';
      const mockTransfersSent = 1500.75;
      const mockWithdrawals = 2500.25;
      const expectedTotal = mockTransfersSent + mockWithdrawals;

      // Simulamos las dos consultas requeridas
      mockQuery.mockResolvedValueOnce([[{ totalTransfersSent: mockTransfersSent.toString() }]]);
      mockQuery.mockResolvedValueOnce([[{ totalWithdrawals: mockWithdrawals.toString() }]]);

      // Ejecución
      const result = await calculateTotalOutcome(accountNumber);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT SUM(monto) AS totalTransfersSent'), [accountNumber]);
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT SUM(monto) AS totalWithdrawals'), [accountNumber]);
      expect(result).toBe(expectedTotal);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar valores nulos de la base de datos', async () => {
      // Configuración
      const accountNumber = '123456789';

      // Simulamos consultas que devuelven valores nulos
      mockQuery.mockResolvedValueOnce([[{ totalTransfersSent: null }]]);
      mockQuery.mockResolvedValueOnce([[{ totalWithdrawals: null }]]);

      // Ejecución
      const result = await calculateTotalOutcome(accountNumber);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(result).toBe(0); // Debe ser 0 si todas las sumas son null
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería propagar un error si falla alguna consulta', async () => {
      // Configuración
      const accountNumber = '123456789';
      const dbError = new Error('Error en la consulta');

      // Simulamos que falla la primera consulta
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error para verificar que se llama
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Ejecución y verificación de excepción propagada
      await expect(calculateTotalOutcome(accountNumber)).rejects.toThrow(dbError);

      // Otras verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error al calcular el egreso total:', dbError);
      expect(mockRelease).toHaveBeenCalledTimes(1); // Asegura que se libera incluso con error

      consoleSpy.mockRestore();
    });
  });
});
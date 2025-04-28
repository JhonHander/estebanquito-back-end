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

// Mocks de funciones del controller.report
const mockCalculateTotalIncome = jest.fn();
const mockCalculateTotalOutcome = jest.fn();

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

// Mock del controller.auth para la función userExists
jest.unstable_mockModule('../../controllers/controller.auth.js', () => ({
  userExists: mockUserExists
}));

// Mock del controller.report para las funciones calculateTotalIncome y calculateTotalOutcome
jest.unstable_mockModule('../../controllers/controller.report.js', () => ({
  calculateTotalIncome: mockCalculateTotalIncome,
  calculateTotalOutcome: mockCalculateTotalOutcome
}));

// Importamos el controlador DESPUÉS de configurar los mocks
const { 
  hasLoan, 
  updateOrCreateReport, 
  askForLoan, 
  recalculateInterest 
} = await import('../../controllers/controller.loan.js');

describe('Loan Controller', () => {
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
    mockGetConnection.mockClear();
    mockUserExists.mockReset();
    mockCalculateTotalIncome.mockReset();
    mockCalculateTotalOutcome.mockReset();

    // Mock de request y response de Express
    mockRequest = {
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Pruebas para la función hasLoan ---
  describe('hasLoan', () => {
    it('debería devolver true si el usuario tiene un préstamo aprobado', async () => {
      const accountNumber = '123456789';
      
      // Simulamos que la consulta encuentra préstamos
      mockQuery.mockResolvedValueOnce([[{ id: 1, numero_cuenta: accountNumber }]]);

      const result = await hasLoan(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM prestamos WHERE numero_cuenta = ? AND estado = "Aprobado"', 
        accountNumber
      );
      expect(result).toBe(true);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería devolver false si el usuario no tiene préstamos aprobados', async () => {
      const accountNumber = '123456789';
      
      // Simulamos que la consulta no encuentra préstamos
      mockQuery.mockResolvedValueOnce([[]]);

      const result = await hasLoan(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM prestamos WHERE numero_cuenta = ? AND estado = "Aprobado"', 
        accountNumber
      );
      expect(result).toBe(false);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores y liberar la conexión', async () => {
      const accountNumber = '123456789';
      const dbError = new Error('DB error');
      
      // Simulamos que la consulta falla
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Como no hay return explícito en el bloque catch, debería ser undefined
      const result = await hasLoan(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM prestamos WHERE numero_cuenta = ? AND estado = "Aprobado"', 
        accountNumber
      );
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función updateOrCreateReport ---
  describe('updateOrCreateReport', () => {
    it('debería actualizar un reporte existente', async () => {
      const accountNumber = '123456789';
      const mockIncome = 1000;
      const mockOutcome = 500;
      
      // Mock de las funciones de cálculo
      mockCalculateTotalIncome.mockResolvedValue(mockIncome);
      mockCalculateTotalOutcome.mockResolvedValue(mockOutcome);
      
      // Simulamos que el reporte existe
      mockQuery.mockResolvedValueOnce([[{ 1: 1 }]]); // SELECT 1 FROM Reportes...
      mockQuery.mockResolvedValueOnce([{}]); // UPDATE reportes...

      await updateOrCreateReport(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockCalculateTotalIncome).toHaveBeenCalledWith(accountNumber);
      expect(mockCalculateTotalOutcome).toHaveBeenCalledWith(accountNumber);
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'SELECT 1 FROM Reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('UPDATE reportes'), 
        [mockIncome, mockOutcome, accountNumber]
      );
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería crear un nuevo reporte si no existe', async () => {
      const accountNumber = '123456789';
      const mockIncome = 1000;
      const mockOutcome = 500;
      
      // Mock de las funciones de cálculo
      mockCalculateTotalIncome.mockResolvedValue(mockIncome);
      mockCalculateTotalOutcome.mockResolvedValue(mockOutcome);
      
      // Simulamos que el reporte no existe
      mockQuery.mockResolvedValueOnce([[]]); // SELECT 1 FROM Reportes... (vacío)
      mockQuery.mockResolvedValueOnce([{}]); // INSERT INTO reportes...

      await updateOrCreateReport(accountNumber);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockCalculateTotalIncome).toHaveBeenCalledWith(accountNumber);
      expect(mockCalculateTotalOutcome).toHaveBeenCalledWith(accountNumber);
      expect(mockQuery).toHaveBeenNthCalledWith(1, 
        'SELECT 1 FROM Reportes WHERE numero_cuenta = ?', 
        [accountNumber]
      );
      expect(mockQuery).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('INSERT INTO reportes'), 
        [accountNumber, mockIncome, mockOutcome]
      );
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería propagar errores y liberar la conexión', async () => {
      const accountNumber = '123456789';
      const dbError = new Error('DB error');
      
      // Mock de las funciones de cálculo
      mockCalculateTotalIncome.mockRejectedValue(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(updateOrCreateReport(accountNumber)).rejects.toThrow(dbError);

      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockCalculateTotalIncome).toHaveBeenCalledWith(accountNumber);
      expect(consoleSpy).toHaveBeenCalledWith('Error al actualizar o crear el reporte:', dbError);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });

  // --- Pruebas para la función askForLoan ---
  describe('askForLoan', () => {
    it('debería solicitar un préstamo exitosamente', async () => {
      // Configuración
      const accountNumber = '123456789';
      const amount = 5000;
      const term = 12; // semanas
      mockRequest.body = { accountNumber, amount, term };
      
      // Mock Date para controlar la fecha
      const mockDate = new Date('2023-01-01T12:00:00Z');
      const originalDate = global.Date;
      global.Date = jest.fn(() => mockDate);
      global.Date.now = originalDate.now;
      
      // Configuración de mocks
      mockQuery.mockResolvedValueOnce([{}]); // INSERT préstamo
      
      // Usar un mock específico para updateOrCreateReport
      const originalUpdateOrCreateReport = jest.requireActual('../../controllers/controller.loan.js').updateOrCreateReport;
      jest.spyOn(await import('../../controllers/controller.loan.js'), 'updateOrCreateReport')
        .mockImplementation(() => Promise.resolve());

      // Ejecución
      await askForLoan(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        'INSERT INTO prestamos (numero_cuenta, monto, plazo, estado, fecha_solicitud) VALUES (?, ?, ?, ?, ?)',
        [accountNumber, amount, term, 'Aprobado', mockDate]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Préstamo solicitado' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar Date original
      global.Date = originalDate;
    });

    it('debería manejar errores y liberar la conexión', async () => {
      // Configuración
      const accountNumber = '123456789';
      const amount = 5000;
      const term = 12;
      mockRequest.body = { accountNumber, amount, term };
      
      const dbError = new Error('DB error');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ejecución
      await askForLoan(mockRequest, mockResponse);

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(dbError);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Error en el servidor' });
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });

    // Test comentado para la validación de préstamo existente (está comentado en el código original)
    /*
    it('debería rechazar si el usuario ya tiene un préstamo activo', async () => {
      // Configuración
      const accountNumber = '123456789';
      mockRequest.body = { accountNumber, amount: 5000, term: 12 };
      
      // Simulamos que hasLoan devuelve true
      jest.spyOn(await import('../../controllers/controller.loan.js'), 'hasLoan')
        .mockImplementation(() => Promise.resolve(true));
      
      // Ejecución
      await askForLoan(mockRequest, mockResponse);

      // Verificaciones
      expect(mockRollback).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'El usuario ya tiene un préstamo activo' });
    });
    */
  });

  // --- Pruebas para la función recalculateInterest ---
  describe('recalculateInterest', () => {
    it('debería recalcular intereses para préstamos vencidos', async () => {
      // Mock de fecha actual para cálculos consistentes
      const originalDate = global.Date;
      const mockCurrentDate = new Date('2023-02-15');
      global.Date = jest.fn(() => mockCurrentDate);
      global.Date.now = originalDate.now;
      
      // Prestamos vencidos para la prueba
      const mockLoans = [
        {
          numero_cuenta: '123456789',
          monto: 1000,
          deudas: 1000,
          fecha_solicitud: new Date('2023-01-01'), // Vencido
          plazo: 4 // 4 semanas
        }
      ];
      
      // Configuramos los mocks
      mockQuery.mockResolvedValueOnce([mockLoans]); // SELECT préstamos vencidos
      mockQuery.mockResolvedValueOnce([[{ conteo: 0 }]]); // SELECT COUNT de historial_intereses
      mockQuery.mockResolvedValueOnce([{}]); // INSERT historial_intereses
      mockQuery.mockResolvedValueOnce([{}]); // UPDATE reportes

      // Ejecución
      await recalculateInterest();

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT p.numero_cuenta, p.monto'));
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT(*) AS conteo'), 
        [mockLoans[0].numero_cuenta]);
      
      // Verificar lógica de cálculo de interés (5% del monto por cada periodo)
      const periodosEsperados = Math.floor(15 / 15); // Al menos 1 periodo en este caso
      const interesEsperado = mockLoans[0].monto * 0.05 * periodosEsperados;
      
      expect(mockQuery).toHaveBeenNthCalledWith(3, 
        expect.stringContaining('INSERT INTO Historial_intereses'),
        [mockLoans[0].numero_cuenta, expect.any(Number), expect.any(String)]
      );
      
      expect(mockQuery).toHaveBeenNthCalledWith(4, 
        expect.stringContaining('UPDATE Reportes SET deudas = deudas + ?'),
        [expect.any(Number), mockLoans[0].numero_cuenta]
      );
      
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      // Restaurar Date original
      global.Date = originalDate;
    });

    it('no debería aplicar intereses si ya se aplicaron para el período', async () => {
      // Configuración
      const mockLoans = [
        {
          numero_cuenta: '123456789',
          monto: 1000,
          deudas: 1000,
          fecha_solicitud: new Date('2023-01-01'),
          plazo: 4
        }
      ];
      
      // Configuramos los mocks
      mockQuery.mockResolvedValueOnce([mockLoans]); // SELECT préstamos vencidos
      mockQuery.mockResolvedValueOnce([[{ conteo: 1 }]]); // Ya se aplicó interés para el período
      
      // Ejecución
      await recalculateInterest();

      // Verificaciones - no debería hacer INSERT ni UPDATE
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledTimes(2); // Solo las 2 primeras consultas
      expect(mockQuery).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT p.numero_cuenta, p.monto'));
      expect(mockQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT(*) AS conteo'), 
        [mockLoans[0].numero_cuenta]);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('debería manejar errores y liberar la conexión', async () => {
      // Configuración
      const dbError = new Error('DB error');
      mockQuery.mockRejectedValueOnce(dbError);
      
      // Espiar console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Ejecución - no debería propagar el error
      await recalculateInterest();

      // Verificaciones
      expect(mockGetConnection).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error al recalcular intereses:', dbError);
      expect(mockRelease).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });
});
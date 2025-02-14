import Database from "better-sqlite3";
import { SessionService } from "../SessionService";
import { TableService } from "../TableService";
import { SessionStatus } from "@/shared/types/Session";
import { TableStatus } from "@/shared/types/Table";
import { NotFoundError, BusinessError } from "@/shared/types/errors";

describe("SessionService", () => {
  let sessionService: SessionService;
  let tableService: TableService;
  let db: Database.Database;
  let tableId: number;

  beforeEach(async () => {
    db = new Database(":memory:");
    sessionService = new SessionService(db);
    tableService = new TableService(db);

    // Create a test table
    const table = await tableService.createTable({
      tableNumber: 1,
      hourlyRate: 20,
    });
    tableId = table.id;
  });

  describe("startSession", () => {
    it("should start a session for an available table", async () => {
      const session = await sessionService.startSession({
        tableId,
      });

      expect(session).toMatchObject({
        tableId,
        status: SessionStatus.ACTIVE,
        customerId: null,
      });
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.endTime).toBeNull();
      expect(session.duration).toBeNull();
      expect(session.cost).toBeNull();

      // Verify table status was updated
      const table = await tableService.getTableById(tableId);
      expect(table.status).toBe(TableStatus.IN_USE);
    });

    it("should start a session with customer ID", async () => {
      const customerId = 123;
      const session = await sessionService.startSession({
        tableId,
        customerId,
      });

      expect(session.customerId).toBe(customerId);
    });

    it("should throw error for non-existent table", async () => {
      await expect(
        sessionService.startSession({
          tableId: 999,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw error for unavailable table", async () => {
      // Start first session
      await sessionService.startSession({ tableId });

      // Try to start another session on same table
      await expect(sessionService.startSession({ tableId })).rejects.toThrow(
        BusinessError
      );
    });
  });

  describe("endSession", () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await sessionService.startSession({
        tableId,
      });
      sessionId = session.id;
    });

    it("should end an active session", async () => {
      const session = await sessionService.endSession(sessionId);

      expect(session.status).toBe(SessionStatus.COMPLETED);
      expect(session.endTime).toBeInstanceOf(Date);
      expect(session.duration).toBeGreaterThanOrEqual(0);
      expect(session.cost).toBeGreaterThanOrEqual(0);

      // Verify table status was updated
      const table = await tableService.getTableById(tableId);
      expect(table.status).toBe(TableStatus.AVAILABLE);
    });

    it("should calculate correct cost", async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const session = await sessionService.startSession({
        tableId,
        startTime,
      });

      const endTime = new Date();
      const endedSession = await sessionService.endSession(session.id, {
        endTime,
      });

      expect(endedSession.cost).toBeCloseTo(20, 2); // Allow small floating-point differences
    });

    it("should throw error for non-existent session", async () => {
      await expect(sessionService.endSession(999)).rejects.toThrow(
        NotFoundError
      );
    });

    it("should throw error for already ended session", async () => {
      await sessionService.endSession(sessionId);
      await expect(sessionService.endSession(sessionId)).rejects.toThrow(
        BusinessError
      );
    });
  });

  describe("getSessionById", () => {
    it("should return the correct session", async () => {
      const startedSession = await sessionService.startSession({
        tableId,
      });

      const session = await sessionService.getSessionById(startedSession.id);
      expect(session).toMatchObject({
        id: startedSession.id,
        tableId,
        status: SessionStatus.ACTIVE,
      });
    });

    it("should throw error for non-existent session", async () => {
      await expect(sessionService.getSessionById(999)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("getActiveSessions", () => {
    beforeEach(async () => {
      // Create another table
      const table2 = await tableService.createTable({
        tableNumber: 2,
        hourlyRate: 25,
      });

      // Start sessions on both tables
      await sessionService.startSession({ tableId });
      await sessionService.startSession({ tableId: table2.id });
    });

    it("should return all active sessions", async () => {
      const sessions = await sessionService.getActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.status === SessionStatus.ACTIVE)).toBe(
        true
      );
    });

    it("should not return ended sessions", async () => {
      // End one session
      const session = await sessionService.getActiveSessions();
      await sessionService.endSession(session[0].id);

      const activeSessions = await sessionService.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
    });
  });

  describe("getTableSessions", () => {
    beforeEach(async () => {
      // Start and end multiple sessions with specific start times in the past
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      await sessionService.startSession({
        tableId,
        startTime: pastTime,
      });

      const session2 = await sessionService.startSession({
        tableId,
        startTime: new Date(pastTime.getTime() + 60 * 60 * 1000), // 1 hour after first session
      });
      await sessionService.endSession(session2.id);
    });

    it("should return all sessions for a table", async () => {
      const sessions = await sessionService.getTableSessions(tableId);
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.tableId === tableId)).toBe(true);
    });

    it("should return empty array for table with no sessions", async () => {
      const sessions = await sessionService.getTableSessions(999);
      expect(sessions).toHaveLength(0);
    });
  });

  describe("getCustomerSessions", () => {
    const customerId = 123;

    beforeEach(async () => {
      const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Create sessions with and without customer ID
      await sessionService.startSession({
        tableId,
        customerId,
        startTime: pastTime,
      });
      await sessionService.startSession({
        tableId,
        startTime: new Date(pastTime.getTime() + 60 * 60 * 1000),
      }); // No customer ID
    });

    it("should return all sessions for a customer", async () => {
      const sessions = await sessionService.getCustomerSessions(customerId);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].customerId).toBe(customerId);
    });

    it("should return empty array for customer with no sessions", async () => {
      const sessions = await sessionService.getCustomerSessions(999);
      expect(sessions).toHaveLength(0);
    });
  });

  describe("cancelSession", () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await sessionService.startSession({
        tableId,
      });
      sessionId = session.id;
    });

    it("should cancel an active session", async () => {
      const session = await sessionService.cancelSession(sessionId);
      expect(session.status).toBe(SessionStatus.CANCELLED);
      expect(session.endTime).toBeInstanceOf(Date);

      // Verify table status was updated
      const table = await tableService.getTableById(tableId);
      expect(table.status).toBe(TableStatus.AVAILABLE);
    });

    it("should throw error for non-existent session", async () => {
      await expect(sessionService.cancelSession(999)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("calculateSessionCost", () => {
    it("should calculate correct cost for completed session", async () => {
      const startTime = new Date();
      const session = await sessionService.startSession({
        tableId,
        startTime,
      });

      // End session after 2 hours
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      const endedSession = await sessionService.endSession(session.id, {
        endTime,
      });

      const cost = await sessionService.calculateSessionCost(endedSession);
      expect(cost).toBe(40); // 2 hours at $20/hour
    });

    it("should throw error for active session", async () => {
      const session = await sessionService.startSession({
        tableId,
      });

      await expect(
        sessionService.calculateSessionCost(session)
      ).rejects.toThrow(BusinessError);
    });
  });
});

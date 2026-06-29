import mongoose from "mongoose";
import type { ClientSession } from "mongoose";

/**
 * Chạy `fn` bên trong một MongoDB transaction.
 *
 * - Nếu cluster hỗ trợ transaction (replica set / Atlas), mọi thao tác ghi
 *   nhận `session` sẽ commit/rollback nguyên khối → tránh lệch quan hệ 2 chiều.
 * - Nếu deployment KHÔNG hỗ trợ transaction (standalone mongod, không replica set),
 *   tự động fallback chạy lại `fn` ở chế độ non-transactional (session = undefined).
 *   Các thao tác trong crawler đều là upsert idempotent nên chạy lại an toàn.
 *
 * Cách dùng:
 *   await withTransaction(async (session) => {
 *     await Model.updateOne(filter, update, { session });
 *   });
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // result chắc chắn đã được gán trong callback ở trên
    return result!;
  } catch (err: any) {
    const msg = String(err?.message || "");
    const code = err?.code;
    // Các mã/thông báo cho biết môi trường không hỗ trợ transaction
    const unsupported =
      code === 20 || // IllegalOperation: Transaction numbers are only allowed on a replica set member or mongos
      code === 263 || // OperationNotSupportedInTransaction
      /Transaction numbers are only allowed|replica set|mongos|not supported|Transactions are not supported/i.test(
        msg
      );

    if (unsupported) {
      console.warn(
        "[withTransaction] Transaction không khả dụng, chạy fallback non-transactional:",
        msg
      );
      return await fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export default withTransaction;

/**
 * SQL Query Builder Helpers
 * 
 * Utilities for building dynamic SQL UPDATE statements
 */

interface UpdateField {
  field: string;
  value: any;
}

interface UpdateQueryResult {
  sql: string;
  params: any[];
}

/**
 * Build dynamic UPDATE query from field map
 * 
 * @example
 * const updates = buildUpdateQuery('products', {
 *   name: 'New Name',
 *   price: 99.99,
 *   updated_at: new Date().toISOString()
 * }, 'id = ?');
 * 
 * // Returns:
 * // {
 * //   sql: "UPDATE products SET name = ?, price = ?, updated_at = ? WHERE id = ?",
 * //   params: ['New Name', 99.99, '2025-10-26T...', productId]
 * // }
 */
export function buildUpdateQuery(
  tableName: string,
  fields: Record<string, any>,
  whereClause: string,
  whereParams: any[] = []
): UpdateQueryResult {
  const updateFields: string[] = [];
  const updateParams: any[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updateFields.push(`${key} = ?`);
      updateParams.push(value);
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }

  const sql = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE ${whereClause}`;
  const params = [...updateParams, ...whereParams];

  return { sql, params };
}

/**
 * Build field updates object from data (filters out undefined values)
 */
export function buildFieldUpdates(
  data: Record<string, any>,
  fieldMapping?: Record<string, string>
): Record<string, any> {
  const updates: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const mappedKey = fieldMapping?.[key] || key;
      updates[mappedKey] = value;
    }
  }

  return updates;
}

/**
 * Convert boolean to SQLite integer (1/0)
 */
export function boolToInt(value: boolean | undefined): number | undefined {
  if (value === undefined) return undefined;
  return value ? 1 : 0;
}
